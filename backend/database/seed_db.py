"""Seed PostgreSQL from Python synthetic generators + ML pipeline."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from backend.database.connection import get_database_url, is_database_enabled
from backend.database.repository import init_schema, province_count, seed_from_dataframes
from backend.database.seed_data import (
    generate_sample_facilities,
    generate_sample_relay_households,
    generate_sample_relays,
    generate_synthetic_dhs_indicators,
)
from backend.ml.vulnerability_model import run_pipeline


def main() -> None:
    if not is_database_enabled():
        raise SystemExit("DATABASE_URL is not set. Copy .env.example to .env and configure Postgres.")

    print("Initializing schema...")
    init_schema()

    if province_count() > 0:
        print(f"Database already has {province_count()} provinces. Reseeding (full replace)...")

    print("Running ML pipeline and generating facilities/relays...")
    scores_df = run_pipeline(random_state=42)
    facilities_df = generate_sample_facilities(random_state=42, facilities_per_province=6)
    relays_df = generate_sample_relays()
    relay_households = generate_sample_relay_households(relays_df)
    indicators_df = generate_synthetic_dhs_indicators(random_state=42)

    print("Writing seed data to database...")
    seed_from_dataframes(scores_df, facilities_df, relays_df, relay_households, indicators_df)
    print(f"Done. Seeded {len(scores_df)} provinces, {len(facilities_df)} facilities, {len(relays_df)} relays.")
    print(f"DATABASE_URL host: {get_database_url().split('@')[-1] if get_database_url() else 'n/a'}")


if __name__ == "__main__":
    main()
