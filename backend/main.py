"""Dama FastAPI backend for vulnerability intelligence and radio support."""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
import json
import os
import unicodedata
import sys
import urllib.error
import urllib.request
import uuid
from typing import Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.database.seed_data import (
    generate_sample_facilities,
    generate_sample_relay_households,
    generate_sample_relays,
)
from backend.models.schemas import (
    FacilityItem,
    FacilityResponse,
    FeedbackRefreshResponse,
    InteractionLogRequest,
    InteractionLogResponse,
    ProvinceDetail,
    RadioScriptResponse,
    RadioScriptSection,
    RelayProfile,
    RelaySyncResponse,
    SiraChatRequest,
    SiraChatResponse,
    RelayVisitRequest,
    RelayVisitResponse,
    VulnerabilityFeature,
    VulnerabilityFeatureCollection,
)
from backend.nlp.moore_templates import MOORE_KEY_PHRASES
from backend.ml.vulnerability_model import build_vulnerability_outputs, run_pipeline


app = FastAPI(title="Dama API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERACTIONS_PATH = Path(__file__).resolve().parent / "database" / "interaction_logs.json"
RELAY_VISITS_PATH = Path(__file__).resolve().parent / "database" / "relay_visits.json"

RISK_TIPS = {
    "distance_to_nearest_csps_km": "Planifier un transport communautaire vers le CSPS le plus proche cette semaine.",
    "poverty_rate": "Rappeler que les services de planification familiale restent gratuits dans les CSPS publics.",
    "displacement_population": "Diffuser des points de service temporaires pour les femmes déplacées dans la province.",
    "conflict_affected_binary": "Prioriser les messages de sécurité et les itinéraires vers les centres ouverts.",
    "maternal_mortality_rate": "Encourager les consultations prénatales dès le premier trimestre.",
    "adolescent_birth_rate": "Diffuser un segment dédié aux adolescentes sur la contraception moderne.",
}

SIRA_SYSTEM_PROMPT = """You are Sira, a warm and knowledgeable SRH health educator
for women and adolescent girls in Burkina Faso.

Your personality:
- Warm, gentle, non-judgmental - like an older sister or trusted aunt
- Never makes the user feel ashamed or wrong for asking
- Uses simple, clear language - no complex medical jargon
- Acknowledges feelings before giving information
- Always ends responses with a path to action

Your knowledge context:
- You know Burkina Faso's health system deeply
- Primary health centers are called CSPS (Centre de Sante et de Promotion Sociale) - there are ~1,900 across the country
- Community health workers are called Relais Communautaires
- Family planning and maternal care are FREE at all CSPS since 2020
- You know the Dama platform and can refer users to /locator to find their nearest CSPS
- Conflict has closed 500+ facilities in northern regions (Sahel, Est, Nord, Centre-Nord)

Language rules:
- Detect the language the user writes in automatically
- Respond in the SAME language they use
- If they write in Moore or mixed French/Moore, respond warmly in French with simple vocabulary
- If they write in English, respond in English
- Never switch languages mid-conversation unless the user does

Topic boundaries:
- You cover: menstruation, family planning, contraception, pregnancy, prenatal care, postnatal care, GBV support, adolescent health, body changes, reproductive anatomy, STIs, cervical health, maternal nutrition
- For questions needing diagnosis: "I can share information but a CSPS nurse can examine you properly - would you like to find the nearest one open today?"
- For crisis/emergency: immediately provide warmth + direct to nearest CSPS or CHW
- For off-topic questions: gently redirect back to SRH topics
- NEVER make the user feel judged, wrong, or shameful

Response format:
- Keep responses under 150 words
- Use short paragraphs, never dense blocks of text
- End EVERY response with one of:
  -> A follow-up question to keep the conversation going
  -> A gentle suggestion to find a CSPS: "Veux-tu trouver le CSPS le plus proche?"
  -> A reassurance statement
- Use checkmark bullets for lists, never numbered lists
- Occasionally use a warm emoji (🌿 💚 ✨) but sparingly

Privacy statement (say this only on first message):
Begin your very first response with:
"Je suis Sira 🌿 Tu peux me poser n'importe quelle question - je ne sais pas qui tu es et je ne le saurai jamais. Tout ce que tu dis ici reste entre nous."
Then answer their question.

Remember: You are often talking to a scared 15-year-old girl who has never been able to ask these questions out loud before. Be the person she needed."""

_scores_df = run_pipeline(random_state=42)
_facilities_df = generate_sample_facilities(random_state=42, facilities_per_province=6)
_relays_df = generate_sample_relays()
_relay_households = generate_sample_relay_households(_relays_df)
_score_history: List[Dict[str, object]] = []


def _row_to_feature(row) -> VulnerabilityFeature:
    return VulnerabilityFeature(
        properties={
            "province_id": int(row["province_id"]),
            "province_name": row["province_name"],
            "region": row["region"],
            "vulnerability_score": float(row["vulnerability_score"]),
            "top_risk_factor": row["top_risk_factor"],
            "data_quality": row["data_quality"],
            "conflict_affected_binary": int(row["conflict_affected_binary"]),
        }
    )


def _get_province_row(province_id: int):
    match = _scores_df[_scores_df["province_id"] == province_id]
    if match.empty:
        raise HTTPException(status_code=404, detail=f"Province {province_id} not found.")
    return match.iloc[0]


def _nearest_open_facility(province_id: int) -> Dict[str, object]:
    subset = _facilities_df[_facilities_df["province_id"] == province_id].copy()
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"No facilities available for province {province_id}.")
    subset = subset.sort_values("distance_km")
    open_subset = subset[subset["is_open"] == True]  # noqa: E712
    selected = open_subset.iloc[0] if not open_subset.empty else subset.iloc[0]
    return selected.to_dict()


def _build_french_script(row) -> RadioScriptSection:
    nearest = _nearest_open_facility(int(row["province_id"]))
    tip = RISK_TIPS.get(
        row["top_risk_factor"],
        "Informer les familles des services SRH disponibles et des horaires de consultation.",
    )
    services = ", ".join(nearest["services"])
    return RadioScriptSection(
        opening="Bienvenue sur Dama Santé, votre bulletin hebdomadaire SRH.",
        district_update=(
            f"Dans la province de {row['province_name']}, le score de vulnérabilité est "
            f"{float(row['vulnerability_score']):.1f} sur 100."
        ),
        nearest_facility=(
            f"Le CSPS le plus proche actuellement ouvert est {nearest['name']}, à "
            f"{float(nearest['distance_km']):.1f} kilomètres."
        ),
        services_available=f"Services disponibles: {services}.",
        chw_contact=f"Pour un accompagnement, contactez votre Relais Communautaire: {nearest['chw_contact']}.",
        srh_tip=f"Conseil santé de la semaine: {tip}",
        qr_announcement="Scannez le code QR Dama à votre CSPS pour localiser les services près de chez vous.",
        closing="Dama — assez de soins, pour chaque femme, partout.",
    )


def _build_moore_script(french_script: RadioScriptSection, nearest: Dict[str, object]) -> RadioScriptSection:
    # MVP template translation scaffold: key phrases in Mooré with fixed French
    # content for unsupported dynamic segments.
    return RadioScriptSection(
        opening=MOORE_KEY_PHRASES["welcome"],
        district_update=french_script.district_update,
        nearest_facility=MOORE_KEY_PHRASES["nearest_facility"].format(
            facility_name=nearest["name"], distance_km=f"{float(nearest['distance_km']):.1f}"
        ),
        services_available=french_script.services_available,
        chw_contact=MOORE_KEY_PHRASES["chw_contact"].format(chw_contact=nearest["chw_contact"]),
        srh_tip=french_script.srh_tip,
        qr_announcement=french_script.qr_announcement,
        closing=MOORE_KEY_PHRASES["closing"],
    )


def _build_english_script(row) -> RadioScriptSection:
    nearest = _nearest_open_facility(int(row["province_id"]))
    tip_map = {
        "distance_to_nearest_csps_km": "Coordinate community transport plans to improve access this week.",
        "poverty_rate": "Remind households that family planning services are free in public facilities.",
        "displacement_population": "Share temporary service points for displaced women and girls.",
        "conflict_affected_binary": "Prioritize safe travel guidance and open-facility information.",
        "maternal_mortality_rate": "Encourage early antenatal consultation in the first trimester.",
        "adolescent_birth_rate": "Include a dedicated adolescent segment on modern contraception options.",
    }
    tip = tip_map.get(
        row["top_risk_factor"],
        "Keep communities informed about available SRH services and consultation schedules.",
    )
    services = ", ".join(nearest["services"])
    return RadioScriptSection(
        opening="Welcome to Dama Health, your weekly SRH update.",
        district_update=(
            f"In {row['province_name']} province, the vulnerability score is "
            f"{float(row['vulnerability_score']):.1f} out of 100."
        ),
        nearest_facility=(
            f"The nearest currently open CSPS is {nearest['name']}, located "
            f"{float(nearest['distance_km']):.1f} kilometers away."
        ),
        services_available=f"Available services include: {services}.",
        chw_contact=f"For support, contact your community relay at: {nearest['chw_contact']}.",
        srh_tip=f"Health tip of the week: {tip}",
        qr_announcement="Scan the Dama QR code at your CSPS to find nearby SRH services.",
        closing="Dama — enough care, for every woman, everywhere.",
    )


def _persist_interaction(payload: Dict[str, object]) -> None:
    logs: List[Dict[str, object]] = []
    if INTERACTIONS_PATH.exists():
        with INTERACTIONS_PATH.open("r", encoding="utf-8") as file:
            logs = json.load(file)
    logs.append(payload)
    with INTERACTIONS_PATH.open("w", encoding="utf-8") as file:
        json.dump(logs, file, indent=2)


def _persist_relay_visit(payload: Dict[str, object]) -> None:
    logs: List[Dict[str, object]] = []
    if RELAY_VISITS_PATH.exists():
        with RELAY_VISITS_PATH.open("r", encoding="utf-8") as file:
            logs = json.load(file)
    logs.append(payload)
    with RELAY_VISITS_PATH.open("w", encoding="utf-8") as file:
        json.dump(logs, file, indent=2)


def _load_logs(path: Path) -> List[Dict[str, object]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return normalized.lower().replace("-", " ").replace("'", " ").replace("  ", " ").strip()


def _initialize_score_history() -> None:
    _score_history.clear()
    now = datetime.now(timezone.utc).isoformat()
    for _, row in _scores_df.iterrows():
        _score_history.append(
            {
                "province_id": int(row["province_id"]),
                "score": float(row["vulnerability_score"]),
                "recorded_at": now,
            }
        )


def _refresh_scores_with_feedback() -> Dict[str, int]:
    global _scores_df
    interaction_logs = _load_logs(INTERACTIONS_PATH)
    relay_logs = _load_logs(RELAY_VISITS_PATH)

    interaction_count = len(interaction_logs)
    relay_count = len(relay_logs)

    # Retrain to keep model artifacts fresh, then apply an MVP demand-signal bump.
    retrained_scores, _ = build_vulnerability_outputs(random_state=42)
    updated = retrained_scores.copy()

    interaction_by_province: Dict[int, int] = {}
    for log in interaction_logs:
        pid = int(log.get("province_id", 0) or 0)
        interaction_by_province[pid] = interaction_by_province.get(pid, 0) + 1

    relay_by_province: Dict[int, int] = {}
    for log in relay_logs:
        pid = int(log.get("province_id", 0) or 0)
        relay_by_province[pid] = relay_by_province.get(pid, 0) + 1

    def apply_signal(row):
        pid = int(row["province_id"])
        uplift = min(interaction_by_province.get(pid, 0) * 0.25 + relay_by_province.get(pid, 0) * 0.35, 8.0)
        return max(0.0, min(float(row["vulnerability_score"]) + uplift, 100.0))

    updated["vulnerability_score"] = updated.apply(apply_signal, axis=1).round(2)
    updated = updated.sort_values("vulnerability_score", ascending=False).reset_index(drop=True)
    _scores_df = updated

    now = datetime.now(timezone.utc).isoformat()
    for _, row in _scores_df.iterrows():
        _score_history.append(
            {
                "province_id": int(row["province_id"]),
                "score": float(row["vulnerability_score"]),
                "recorded_at": now,
            }
        )

    return {"interaction_logs": interaction_count, "relay_visits": relay_count}


def _call_sira(messages: List[Dict[str, str]], language_mode: str = "auto") -> str:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY is not configured on the backend.",
        )

    language_overrides = {
        "fr": "Language override for this conversation: respond only in French.",
        "en": "Language override for this conversation: respond only in English.",
    }
    effective_system = SIRA_SYSTEM_PROMPT
    if language_mode in language_overrides:
        effective_system = f"{SIRA_SYSTEM_PROMPT}\n\n{language_overrides[language_mode]}"

    payload = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 1000,
        "system": effective_system,
        "messages": messages,
    }
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_text = exc.read().decode("utf-8", errors="replace")
        raise HTTPException(
            status_code=502,
            detail=f"Anthropic request failed: {error_text[:300]}",
        ) from exc
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach Anthropic: {exc.reason}") from exc

    try:
        parsed = json.loads(body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="Anthropic returned a non-JSON response.") from exc

    content = parsed.get("content", [])
    if not isinstance(content, list):
        raise HTTPException(status_code=502, detail="Anthropic response format was unexpected.")

    text_parts = [item.get("text", "") for item in content if isinstance(item, dict) and item.get("type") == "text"]
    reply = "\n".join(text_parts).strip()
    if not reply:
        raise HTTPException(status_code=502, detail="Sira returned an empty response.")
    return reply


_initialize_score_history()


@app.get("/api/vulnerability/scores", response_model=VulnerabilityFeatureCollection)
def get_vulnerability_scores() -> VulnerabilityFeatureCollection:
    features = [_row_to_feature(row) for _, row in _scores_df.iterrows()]
    return VulnerabilityFeatureCollection(features=features)


@app.get("/api/vulnerability/district/{province_id}", response_model=ProvinceDetail)
def get_province_detail(province_id: int) -> ProvinceDetail:
    row = _get_province_row(province_id)
    return ProvinceDetail(
        province_id=int(row["province_id"]),
        province_name=row["province_name"],
        region=row["region"],
        vulnerability_score=float(row["vulnerability_score"]),
        top_risk_factor=row["top_risk_factor"],
        data_quality=row["data_quality"],
        component_breakdown={k: float(v) for k, v in row["component_breakdown"].items()},
        metrics={
            "number_of_open_csps": float(row["number_of_open_csps"]),
            "number_of_closed_csps": float(row["number_of_closed_csps"]),
            "distance_to_nearest_csps_km": float(row["distance_to_nearest_csps_km"]),
            "contraceptive_availability_pct": float(row["contraceptive_availability_pct"]),
            "displacement_population": float(row["displacement_population"]),
            "chw_density_per_1000": float(row["chw_density_per_1000"]),
        },
    )


@app.get("/api/vulnerability/top-priority", response_model=List[ProvinceDetail])
def get_top_priority() -> List[ProvinceDetail]:
    top = _scores_df.sort_values("vulnerability_score", ascending=False).head(10)
    return [
        ProvinceDetail(
            province_id=int(row["province_id"]),
            province_name=row["province_name"],
            region=row["region"],
            vulnerability_score=float(row["vulnerability_score"]),
            top_risk_factor=row["top_risk_factor"],
            data_quality=row["data_quality"],
            component_breakdown={k: float(v) for k, v in row["component_breakdown"].items()},
            metrics={
                "number_of_open_csps": float(row["number_of_open_csps"]),
                "number_of_closed_csps": float(row["number_of_closed_csps"]),
                "distance_to_nearest_csps_km": float(row["distance_to_nearest_csps_km"]),
                "contraceptive_availability_pct": float(row["contraceptive_availability_pct"]),
                "displacement_population": float(row["displacement_population"]),
                "chw_density_per_1000": float(row["chw_density_per_1000"]),
            },
        )
        for _, row in top.iterrows()
    ]


@app.get("/api/radio/script/{province_id}", response_model=RadioScriptResponse)
def get_radio_script(province_id: int) -> RadioScriptResponse:
    row = _get_province_row(province_id)
    nearest = _nearest_open_facility(province_id)
    english_script = _build_english_script(row)
    french_script = _build_french_script(row)
    moore_script = _build_moore_script(french_script, nearest)

    return RadioScriptResponse(
        province_id=province_id,
        province_name=row["province_name"],
        generated_at=datetime.now(timezone.utc),
        top_risk_factor=row["top_risk_factor"],
        english_script=english_script,
        french_script=french_script,
        moore_script=moore_script,
    )


@app.post("/api/locator/interaction", response_model=InteractionLogResponse)
def log_locator_interaction(payload: InteractionLogRequest) -> InteractionLogResponse:
    _get_province_row(payload.province_id)
    now = datetime.now(timezone.utc)
    interaction_id = str(uuid.uuid4())
    serializable = {
        "interaction_id": interaction_id,
        "province_id": payload.province_id,
        "interaction_type": payload.interaction_type,
        "source": payload.source,
        "user_agent": payload.user_agent,
        "logged_at": now.isoformat(),
    }
    _persist_interaction(serializable)
    return InteractionLogResponse(
        message="Interaction logged successfully.",
        interaction_id=interaction_id,
        logged_at=now,
    )


@app.get("/api/locator/facilities/{province_id}", response_model=FacilityResponse)
def get_locator_facilities(province_id: int) -> FacilityResponse:
    _get_province_row(province_id)
    subset = _facilities_df[_facilities_df["province_id"] == province_id].copy()
    if subset.empty:
        raise HTTPException(status_code=404, detail=f"No facilities available for province {province_id}.")

    facilities = [
        FacilityItem(
            facility_id=int(row["facility_id"]),
            province_id=int(row["province_id"]),
            province_name=row["province_name"],
            name=row["name"],
            facility_type=row["facility_type"],
            is_open=bool(row["is_open"]),
            distance_km=float(row["distance_km"]),
            services=list(row["services"]),
            chw_contact=row["chw_contact"],
        )
        for _, row in subset.sort_values("distance_km").iterrows()
    ]

    return FacilityResponse(province_id=province_id, facilities=facilities)


@app.get("/api/relay/sync/{relay_id}", response_model=RelaySyncResponse)
def get_relay_sync(relay_id: str) -> RelaySyncResponse:
    relay_match = _relays_df[_relays_df["relay_id"] == relay_id]
    if relay_match.empty:
        raise HTTPException(status_code=404, detail=f"Relay {relay_id} not found.")
    relay_row = relay_match.iloc[0]
    relay = RelayProfile(
        relay_id=relay_row["relay_id"],
        relay_name=relay_row["relay_name"],
        province_id=int(relay_row["province_id"]),
        commune=relay_row["commune"],
        phone=relay_row["phone"],
        assigned_households=int(relay_row["assigned_households"]),
    )
    return RelaySyncResponse(
        relay=relay,
        households=_relay_households.get(relay_id, []),
        last_synced=datetime.now(timezone.utc),
    )


@app.post("/api/relay/visit", response_model=RelayVisitResponse)
def post_relay_visit(payload: RelayVisitRequest) -> RelayVisitResponse:
    relay_match = _relays_df[_relays_df["relay_id"] == payload.relay_id]
    if relay_match.empty:
        raise HTTPException(status_code=404, detail=f"Relay {payload.relay_id} not found.")
    _get_province_row(payload.province_id)

    now = datetime.now(timezone.utc)
    visit_id = str(uuid.uuid4())
    serializable = {
        "visit_id": visit_id,
        "relay_id": payload.relay_id,
        "province_id": payload.province_id,
        "household_label": payload.household_label,
        "srh_need_identified": payload.srh_need_identified,
        "referral_made": payload.referral_made,
        "service_type": payload.service_type,
        "logged_at": now.isoformat(),
    }
    _persist_relay_visit(serializable)
    return RelayVisitResponse(
        message="Relay visit submitted successfully.",
        visit_id=visit_id,
        logged_at=now,
    )


@app.post("/api/feedback/refresh", response_model=FeedbackRefreshResponse)
def post_feedback_refresh() -> FeedbackRefreshResponse:
    summary = _refresh_scores_with_feedback()
    refreshed_at = datetime.now(timezone.utc)
    top_priority = [
        {
            "province_id": int(row["province_id"]),
            "province_name": row["province_name"],
            "score": float(row["vulnerability_score"]),
            "top_risk_factor": row["top_risk_factor"],
        }
        for _, row in _scores_df.head(10).iterrows()
    ]
    return FeedbackRefreshResponse(
        message="Feedback loop refresh complete. Scores updated with latest interactions.",
        refreshed_at=refreshed_at,
        top_priority=top_priority,
        interaction_summary=summary,
    )


@app.post("/api/sira/chat", response_model=SiraChatResponse)
def post_sira_chat(payload: SiraChatRequest) -> SiraChatResponse:
    messages = [{"role": item.role, "content": item.content} for item in payload.messages]
    response_text = _call_sira(messages, payload.language_mode)
    return SiraChatResponse(response=response_text)
