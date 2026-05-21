"""PostgreSQL persistence for Dama API data."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import pandas as pd
from sqlalchemy import delete, func, select

from backend.database.connection import get_engine, is_database_enabled, session_scope
from backend.database.models import (
    Base,
    Facility,
    InteractionLog,
    Province,
    ProvinceIndicator,
    Relay,
    RelayHousehold,
    RelayVisit,
    ScoreHistory,
    VulnerabilityScore,
)

METRIC_KEYS = [
    "number_of_open_csps",
    "number_of_closed_csps",
    "distance_to_nearest_csps_km",
    "contraceptive_availability_pct",
    "displacement_population",
    "chw_density_per_1000",
]


def init_schema() -> None:
    if not is_database_enabled():
        return
    Base.metadata.create_all(bind=get_engine())


def province_count() -> int:
    with session_scope() as session:
        return int(session.scalar(select(func.count()).select_from(Province)) or 0)


def seed_from_dataframes(
    scores_df: pd.DataFrame,
    facilities_df: pd.DataFrame,
    relays_df: pd.DataFrame,
    relay_households: Dict[str, List[str]],
    indicators_df: pd.DataFrame,
) -> None:
    """Replace all seed data (idempotent full reseed)."""
    with session_scope() as session:
        session.execute(delete(ScoreHistory))
        session.execute(delete(InteractionLog))
        session.execute(delete(RelayVisit))
        session.execute(delete(RelayHousehold))
        session.execute(delete(Relay))
        session.execute(delete(Facility))
        session.execute(delete(VulnerabilityScore))
        session.execute(delete(ProvinceIndicator))
        session.execute(delete(Province))

        for _, row in scores_df.iterrows():
            session.add(
                Province(
                    id=int(row["province_id"]),
                    name=row["province_name"],
                    region=row["region"],
                    conflict_affected=bool(row["conflict_affected_binary"]),
                )
            )
        session.flush()

        for _, row in indicators_df.iterrows():
            pid = int(row["province_id"])
            payload = row.drop(labels=["province_id", "province_name", "region"], errors="ignore").to_dict()
            for key, value in list(payload.items()):
                if hasattr(value, "item"):
                    payload[key] = value.item()
            session.add(ProvinceIndicator(province_id=pid, indicators=payload))
        session.flush()

        now = datetime.now(timezone.utc)
        for _, row in scores_df.iterrows():
            metrics = {k: float(row[k]) for k in METRIC_KEYS if k in row}
            session.add(
                VulnerabilityScore(
                    province_id=int(row["province_id"]),
                    score=float(row["vulnerability_score"]),
                    top_risk_factor=str(row["top_risk_factor"]),
                    data_quality=str(row.get("data_quality", "estimated")),
                    component_breakdown=dict(row["component_breakdown"]),
                    metrics=metrics,
                    updated_at=now,
                )
            )
            session.add(
                ScoreHistory(
                    province_id=int(row["province_id"]),
                    score=float(row["vulnerability_score"]),
                    recorded_at=now,
                )
            )
        session.flush()

        for _, row in facilities_df.iterrows():
            session.add(
                Facility(
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
            )

        for _, row in relays_df.iterrows():
            session.add(
                Relay(
                    relay_id=row["relay_id"],
                    relay_name=row["relay_name"],
                    province_id=int(row["province_id"]),
                    commune=row["commune"],
                    phone=row["phone"],
                    assigned_households=int(row["assigned_households"]),
                )
            )

        for relay_id, labels in relay_households.items():
            for label in labels:
                session.add(RelayHousehold(relay_id=relay_id, household_label=label))


def get_scores_dataframe() -> pd.DataFrame:
    with session_scope() as session:
        rows = session.scalars(
            select(VulnerabilityScore).order_by(VulnerabilityScore.score.desc())
        ).all()
        if not rows:
            return pd.DataFrame()

        records = []
        for vs in rows:
            province = session.get(Province, vs.province_id)
            indicator = session.get(ProvinceIndicator, vs.province_id)
            ind = indicator.indicators if indicator else {}
            record = {
                "province_id": vs.province_id,
                "province_name": province.name if province else "",
                "region": province.region if province else "",
                "conflict_affected_binary": int(province.conflict_affected) if province else 0,
                "vulnerability_score": vs.score,
                "top_risk_factor": vs.top_risk_factor,
                "data_quality": vs.data_quality,
                "component_breakdown": vs.component_breakdown,
                **vs.metrics,
                **ind,
            }
            records.append(record)
        return pd.DataFrame(records)


def replace_scores_dataframe(scores_df: pd.DataFrame) -> None:
    now = datetime.now(timezone.utc)
    with session_scope() as session:
        for _, row in scores_df.iterrows():
            pid = int(row["province_id"])
            vs = session.scalar(select(VulnerabilityScore).where(VulnerabilityScore.province_id == pid))
            metrics = {k: float(row[k]) for k in METRIC_KEYS if k in row}
            if vs:
                vs.score = float(row["vulnerability_score"])
                vs.top_risk_factor = str(row["top_risk_factor"])
                vs.data_quality = str(row.get("data_quality", "estimated"))
                vs.component_breakdown = dict(row["component_breakdown"])
                vs.metrics = metrics
                vs.updated_at = now
            session.add(
                ScoreHistory(
                    province_id=pid,
                    score=float(row["vulnerability_score"]),
                    recorded_at=now,
                )
            )


def get_facilities_dataframe() -> pd.DataFrame:
    with session_scope() as session:
        facilities = session.scalars(select(Facility)).all()
        if not facilities:
            return pd.DataFrame()
        return pd.DataFrame(
            [
                {
                    "facility_id": f.facility_id,
                    "province_id": f.province_id,
                    "province_name": f.province_name,
                    "name": f.name,
                    "facility_type": f.facility_type,
                    "is_open": f.is_open,
                    "distance_km": f.distance_km,
                    "services": f.services,
                    "chw_contact": f.chw_contact,
                }
                for f in facilities
            ]
        )


def get_relays_dataframe() -> pd.DataFrame:
    with session_scope() as session:
        relays = session.scalars(select(Relay)).all()
        if not relays:
            return pd.DataFrame()
        return pd.DataFrame(
            [
                {
                    "relay_id": r.relay_id,
                    "relay_name": r.relay_name,
                    "province_id": r.province_id,
                    "commune": r.commune,
                    "phone": r.phone,
                    "assigned_households": r.assigned_households,
                }
                for r in relays
            ]
        )


def get_relay_households() -> Dict[str, List[str]]:
    with session_scope() as session:
        rows = session.scalars(select(RelayHousehold)).all()
        result: Dict[str, List[str]] = {}
        for row in rows:
            result.setdefault(row.relay_id, []).append(row.household_label)
        return result


def insert_interaction(
    interaction_id: str,
    province_id: int,
    interaction_type: str,
    source: str,
    user_agent: Optional[str],
    logged_at: datetime,
) -> None:
    with session_scope() as session:
        session.add(
            InteractionLog(
                interaction_id=interaction_id,
                province_id=province_id,
                interaction_type=interaction_type,
                source=source,
                user_agent=user_agent,
                logged_at=logged_at,
            )
        )


def insert_relay_visit(
    visit_id: str,
    relay_id: str,
    province_id: int,
    household_label: str,
    srh_need_identified: bool,
    referral_made: bool,
    service_type: str,
    logged_at: datetime,
) -> None:
    with session_scope() as session:
        session.add(
            RelayVisit(
                visit_id=visit_id,
                relay_id=relay_id,
                province_id=province_id,
                household_label=household_label,
                srh_need_identified=srh_need_identified,
                referral_made=referral_made,
                service_type=service_type,
                logged_at=logged_at,
            )
        )


def feedback_log_counts() -> Tuple[Dict[int, int], Dict[int, int], int, int]:
    with session_scope() as session:
        interactions = session.scalars(select(InteractionLog)).all()
        visits = session.scalars(select(RelayVisit)).all()

    interaction_by_province: Dict[int, int] = {}
    for log in interactions:
        pid = int(log.province_id)
        interaction_by_province[pid] = interaction_by_province.get(pid, 0) + 1

    relay_by_province: Dict[int, int] = {}
    for log in visits:
        pid = int(log.province_id)
        relay_by_province[pid] = relay_by_province.get(pid, 0) + 1

    return interaction_by_province, relay_by_province, len(interactions), len(visits)
