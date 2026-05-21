"""Unified data access: PostgreSQL when DATABASE_URL is set, else in-memory seed."""

from __future__ import annotations

import json
import logging
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd

logger = logging.getLogger("dama.store")

_store: Optional["DataStore"] = None
_init_error: Optional[str] = None
_init_lock = threading.Lock()

from backend.database.connection import is_database_enabled
from backend.database import repository as db
from backend.database.seed_data import (
    generate_sample_facilities,
    generate_sample_relay_households,
    generate_sample_relays,
    generate_synthetic_dhs_indicators,
)
from backend.ml.vulnerability_model import build_vulnerability_outputs, run_pipeline

INTERACTIONS_PATH = Path(__file__).resolve().parent / "interaction_logs.json"
RELAY_VISITS_PATH = Path(__file__).resolve().parent / "relay_visits.json"


class DataStore:
    def __init__(self) -> None:
        self.use_db = is_database_enabled()
        if self.use_db:
            db.init_schema()
            if db.province_count() == 0:
                self._seed_database()
            self._scores_df = db.get_scores_dataframe()
            self._facilities_df = db.get_facilities_dataframe()
            self._relays_df = db.get_relays_dataframe()
            self._relay_households = db.get_relay_households()
        else:
            self._scores_df = run_pipeline(random_state=42)
            self._facilities_df = generate_sample_facilities(random_state=42, facilities_per_province=6)
            self._relays_df = generate_sample_relays()
            self._relay_households = generate_sample_relay_households(self._relays_df)
        self._score_history: List[Dict[str, object]] = []
        self._init_score_history()

    def _seed_database(self) -> None:
        from backend.database.seed_db import main as seed_main

        seed_main()

    @property
    def scores_df(self) -> pd.DataFrame:
        return self._scores_df

    @property
    def facilities_df(self) -> pd.DataFrame:
        return self._facilities_df

    @property
    def relays_df(self) -> pd.DataFrame:
        return self._relays_df

    @property
    def relay_households(self) -> Dict[str, List[str]]:
        return self._relay_households

    def reload_scores(self) -> None:
        if self.use_db:
            self._scores_df = db.get_scores_dataframe()
        return None

    def _init_score_history(self) -> None:
        self._score_history.clear()
        now = datetime.now(timezone.utc).isoformat()
        for _, row in self._scores_df.iterrows():
            self._score_history.append(
                {
                    "province_id": int(row["province_id"]),
                    "score": float(row["vulnerability_score"]),
                    "recorded_at": now,
                }
            )

    def persist_interaction(self, payload: Dict[str, object]) -> None:
        if self.use_db:
            db.insert_interaction(
                interaction_id=str(payload["interaction_id"]),
                province_id=int(payload["province_id"]),
                interaction_type=str(payload["interaction_type"]),
                source=str(payload["source"]),
                user_agent=payload.get("user_agent"),
                logged_at=datetime.fromisoformat(str(payload["logged_at"])),
            )
            return
        logs: List[Dict[str, object]] = []
        if INTERACTIONS_PATH.exists():
            with INTERACTIONS_PATH.open("r", encoding="utf-8") as file:
                logs = json.load(file)
        logs.append(payload)
        with INTERACTIONS_PATH.open("w", encoding="utf-8") as file:
            json.dump(logs, file, indent=2)

    def persist_relay_visit(self, payload: Dict[str, object]) -> None:
        if self.use_db:
            db.insert_relay_visit(
                visit_id=str(payload["visit_id"]),
                relay_id=str(payload["relay_id"]),
                province_id=int(payload["province_id"]),
                household_label=str(payload["household_label"]),
                srh_need_identified=bool(payload["srh_need_identified"]),
                referral_made=bool(payload["referral_made"]),
                service_type=str(payload["service_type"]),
                logged_at=datetime.fromisoformat(str(payload["logged_at"])),
            )
            return
        logs: List[Dict[str, object]] = []
        if RELAY_VISITS_PATH.exists():
            with RELAY_VISITS_PATH.open("r", encoding="utf-8") as file:
                logs = json.load(file)
        logs.append(payload)
        with RELAY_VISITS_PATH.open("w", encoding="utf-8") as file:
            json.dump(logs, file, indent=2)

    def _load_json_logs(self, path: Path) -> List[Dict[str, object]]:
        if not path.exists():
            return []
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)

    def refresh_scores_with_feedback(self) -> Dict[str, int]:
        if self.use_db:
            interaction_by, relay_by, interaction_count, relay_count = db.feedback_log_counts()
        else:
            interaction_logs = self._load_json_logs(INTERACTIONS_PATH)
            relay_logs = self._load_json_logs(RELAY_VISITS_PATH)
            interaction_count = len(interaction_logs)
            relay_count = len(relay_logs)
            interaction_by = {}
            for log in interaction_logs:
                pid = int(log.get("province_id", 0) or 0)
                interaction_by[pid] = interaction_by.get(pid, 0) + 1
            relay_by = {}
            for log in relay_logs:
                pid = int(log.get("province_id", 0) or 0)
                relay_by[pid] = relay_by.get(pid, 0) + 1

        retrained_scores, _ = build_vulnerability_outputs(random_state=42)
        updated = retrained_scores.copy()

        def apply_signal(row):
            pid = int(row["province_id"])
            uplift = min(interaction_by.get(pid, 0) * 0.25 + relay_by.get(pid, 0) * 0.35, 8.0)
            return max(0.0, min(float(row["vulnerability_score"]) + uplift, 100.0))

        updated["vulnerability_score"] = updated.apply(apply_signal, axis=1).round(2)
        updated = updated.sort_values("vulnerability_score", ascending=False).reset_index(drop=True)
        self._scores_df = updated

        if self.use_db:
            db.replace_scores_dataframe(updated)

        now = datetime.now(timezone.utc).isoformat()
        for _, row in self._scores_df.iterrows():
            self._score_history.append(
                {
                    "province_id": int(row["province_id"]),
                    "score": float(row["vulnerability_score"]),
                    "recorded_at": now,
                }
            )

        return {"interaction_logs": interaction_count, "relay_visits": relay_count}


def get_store() -> DataStore:
    """Lazy singleton so uvicorn can bind the port before ML/DB seed runs."""
    global _store, _init_error
    if _store is not None:
        return _store
    if _init_error:
        raise RuntimeError(_init_error)
    with _init_lock:
        if _store is not None:
            return _store
        try:
            logger.info("Initializing Dama data store...")
            _store = DataStore()
            logger.info(
                "Data store ready: provinces=%s database=%s",
                len(_store.scores_df),
                _store.use_db,
            )
            return _store
        except Exception as exc:
            _init_error = str(exc)
            logger.error("Data store initialization failed:\n%s", traceback.format_exc())
            raise


def get_store_status() -> Dict[str, object]:
    """Non-throwing status for /health before or after init."""
    if _store is not None:
        return {
            "status": "ok",
            "database": _store.use_db,
            "provinces": len(_store.scores_df),
        }
    if _init_error:
        return {"status": "error", "database": is_database_enabled(), "detail": _init_error}
    return {
        "status": "starting",
        "database": is_database_enabled(),
        "provinces": 0,
        "detail": "Data store not loaded yet; first API call will initialize.",
    }
