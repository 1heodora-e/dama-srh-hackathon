"""Seed and synthetic data utilities for the Dama vulnerability engine.

This module centralizes Burkina Faso province metadata and realistic SRH
indicator ranges used to generate MVP-grade synthetic training inputs.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class ProvinceRecord:
    """Core province metadata needed for the ML seed layer."""

    province_id: int
    province_name: str
    region: str
    conflict_affected_binary: int


# 45 provinces across Burkina Faso's 13 regions.
# The conflict_affected set intentionally emphasizes Sahel, Est, Nord,
# and Centre-Nord as requested in the PRD.
PROVINCES: List[ProvinceRecord] = [
    ProvinceRecord(1, "Bale", "Boucle du Mouhoun", 0),
    ProvinceRecord(2, "Banwa", "Boucle du Mouhoun", 0),
    ProvinceRecord(3, "Kossi", "Boucle du Mouhoun", 0),
    ProvinceRecord(4, "Mouhoun", "Boucle du Mouhoun", 0),
    ProvinceRecord(5, "Nayala", "Boucle du Mouhoun", 0),
    ProvinceRecord(6, "Sourou", "Boucle du Mouhoun", 0),
    ProvinceRecord(7, "Comoe", "Cascades", 0),
    ProvinceRecord(8, "Leraba", "Cascades", 0),
    ProvinceRecord(9, "Kouritenga", "Centre-Est", 0),
    ProvinceRecord(10, "Koulpelogo", "Centre-Est", 0),
    ProvinceRecord(11, "Boulgou", "Centre-Est", 0),
    ProvinceRecord(12, "Kadiogo", "Centre", 0),
    ProvinceRecord(13, "Bam", "Centre-Nord", 1),
    ProvinceRecord(14, "Namentenga", "Centre-Nord", 1),
    ProvinceRecord(15, "Sanmatenga", "Centre-Nord", 1),
    ProvinceRecord(16, "Boulkiemde", "Centre-Ouest", 0),
    ProvinceRecord(17, "Sanguie", "Centre-Ouest", 0),
    ProvinceRecord(18, "Sissili", "Centre-Ouest", 0),
    ProvinceRecord(19, "Ziro", "Centre-Ouest", 0),
    ProvinceRecord(20, "Nahouri", "Centre-Sud", 0),
    ProvinceRecord(21, "Zoundweogo", "Centre-Sud", 0),
    ProvinceRecord(22, "Bazega", "Centre-Sud", 0),
    ProvinceRecord(23, "Gnagna", "Est", 1),
    ProvinceRecord(24, "Gourma", "Est", 1),
    ProvinceRecord(25, "Kompienga", "Est", 1),
    ProvinceRecord(26, "Komondjari", "Est", 0),
    ProvinceRecord(27, "Tapoa", "Est", 1),
    ProvinceRecord(28, "Houet", "Hauts-Bassins", 0),
    ProvinceRecord(29, "Kenedougou", "Hauts-Bassins", 0),
    ProvinceRecord(30, "Tuy", "Hauts-Bassins", 0),
    ProvinceRecord(31, "Loroum", "Nord", 1),
    ProvinceRecord(32, "Passore", "Nord", 0),
    ProvinceRecord(33, "Yatenga", "Nord", 1),
    ProvinceRecord(34, "Zondoma", "Nord", 1),
    ProvinceRecord(35, "Ganzourgou", "Plateau-Central", 0),
    ProvinceRecord(36, "Kourweogo", "Plateau-Central", 0),
    ProvinceRecord(37, "Oubritenga", "Plateau-Central", 0),
    ProvinceRecord(38, "Oudalan", "Sahel", 1),
    ProvinceRecord(39, "Seno", "Sahel", 1),
    ProvinceRecord(40, "Soum", "Sahel", 1),
    ProvinceRecord(41, "Yagha", "Sahel", 1),
    ProvinceRecord(42, "Bougouriba", "Sud-Ouest", 0),
    ProvinceRecord(43, "Ioba", "Sud-Ouest", 0),
    ProvinceRecord(44, "Noumbiel", "Sud-Ouest", 0),
    ProvinceRecord(45, "Poni", "Sud-Ouest", 0),
]


# Heuristic ranges anchored to DHS-style SRH and access indicators.
# Values are used for synthetic generation and kept broad enough to reflect
# inter-province disparities while avoiding extreme outliers.
DHS_2021_RANGE_HINTS: Dict[str, tuple[float, float]] = {
    "population_density": (35.0, 240.0),  # people / km^2
    "poverty_rate": (0.22, 0.72),  # proportion
    "distance_to_nearest_csps_km": (1.2, 23.5),
    "number_of_open_csps": (12.0, 65.0),
    "number_of_closed_csps": (0.0, 15.0),
    "chw_density_per_1000": (0.2, 2.8),
    "contraceptive_availability_pct": (35.0, 89.0),
    "maternal_mortality_rate": (180.0, 460.0),  # per 100k births
    "adolescent_birth_rate": (62.0, 175.0),  # per 1k girls (15-19)
    "displacement_population": (0.0, 210000.0),
    "child_marriage_rate_pct": (28.0, 69.0),
}


def get_province_seed_data() -> pd.DataFrame:
    """Return canonical province metadata as a DataFrame."""

    return pd.DataFrame([p.__dict__ for p in PROVINCES])


def generate_sample_facility_counts(
    province_df: pd.DataFrame, rng: np.random.Generator
) -> pd.DataFrame:
    """Generate sample CSPS availability per province for MVP demos."""

    open_counts = []
    closed_counts = []
    nearest_distance = []

    for _, row in province_df.iterrows():
        if row["conflict_affected_binary"] == 1:
            open_csps = int(rng.integers(12, 38))
            closed_csps = int(rng.integers(4, 16))
            distance = float(rng.uniform(6.5, 23.5))
        else:
            open_csps = int(rng.integers(28, 66))
            closed_csps = int(rng.integers(0, 5))
            distance = float(rng.uniform(1.2, 11.0))

        open_counts.append(open_csps)
        closed_counts.append(closed_csps)
        nearest_distance.append(round(distance, 2))

    return pd.DataFrame(
        {
            "province_id": province_df["province_id"].values,
            "number_of_open_csps": open_counts,
            "number_of_closed_csps": closed_counts,
            "distance_to_nearest_csps_km": nearest_distance,
        }
    )


def generate_synthetic_dhs_indicators(random_state: int = 42) -> pd.DataFrame:
    """Generate realistic district-level SRH features for all 45 provinces."""

    rng = np.random.default_rng(random_state)
    provinces = get_province_seed_data()
    facilities = generate_sample_facility_counts(provinces, rng)
    df = provinces.merge(facilities, on="province_id", how="left")

    # Generate smooth-but-diverse values; conflict provinces are shifted toward
    # higher risk to reflect likely service collapse in affected zones.
    risk_shift = np.where(df["conflict_affected_binary"] == 1, 1.0, 0.0)

    df["population_density"] = np.clip(
        rng.normal(92 + 22 * risk_shift, 34, len(df)), *DHS_2021_RANGE_HINTS["population_density"]
    ).round(2)
    df["poverty_rate"] = np.clip(
        rng.normal(0.44 + 0.12 * risk_shift, 0.09, len(df)), *DHS_2021_RANGE_HINTS["poverty_rate"]
    ).round(3)
    df["chw_density_per_1000"] = np.clip(
        rng.normal(1.45 - 0.45 * risk_shift, 0.35, len(df)), *DHS_2021_RANGE_HINTS["chw_density_per_1000"]
    ).round(3)
    df["contraceptive_availability_pct"] = np.clip(
        rng.normal(63 - 16 * risk_shift, 11, len(df)),
        *DHS_2021_RANGE_HINTS["contraceptive_availability_pct"],
    ).round(1)
    df["maternal_mortality_rate"] = np.clip(
        rng.normal(280 + 78 * risk_shift, 52, len(df)),
        *DHS_2021_RANGE_HINTS["maternal_mortality_rate"],
    ).round(1)
    df["adolescent_birth_rate"] = np.clip(
        rng.normal(104 + 28 * risk_shift, 17, len(df)),
        *DHS_2021_RANGE_HINTS["adolescent_birth_rate"],
    ).round(1)
    df["displacement_population"] = np.where(
        df["conflict_affected_binary"] == 1,
        rng.integers(15000, 210001, size=len(df)),
        rng.integers(0, 18001, size=len(df)),
    )
    df["child_marriage_rate_pct"] = np.clip(
        rng.normal(47 + 10 * risk_shift, 8, len(df)), *DHS_2021_RANGE_HINTS["child_marriage_rate_pct"]
    ).round(1)

    # Include one optional SRH indicator used in broader PRD architecture.
    df["modern_contraceptive_prevalence"] = np.clip(
        rng.normal(26 - 7 * risk_shift, 6, len(df)), 10, 48
    ).round(1)

    return df


def generate_sample_facilities(random_state: int = 42, facilities_per_province: int = 6) -> pd.DataFrame:
    """Generate sample CSPS facility records for each province."""

    rng = np.random.default_rng(random_state)
    indicator_df = generate_synthetic_dhs_indicators(random_state=random_state)[
        ["province_id", "province_name", "conflict_affected_binary", "number_of_open_csps"]
    ].copy()

    records = []
    services_catalog = [
        "family planning",
        "prenatal care",
        "postnatal care",
        "gbv support",
        "adolescent counseling",
    ]

    for _, row in indicator_df.iterrows():
        for idx in range(1, facilities_per_province + 1):
            open_bias = 0.62 if row["conflict_affected_binary"] == 1 else 0.9
            is_open = bool(rng.random() <= open_bias)
            selected_services = list(
                rng.choice(services_catalog, size=int(rng.integers(2, 5)), replace=False)
            )
            records.append(
                {
                    "facility_id": int(row["province_id"] * 100 + idx),
                    "province_id": int(row["province_id"]),
                    "province_name": row["province_name"],
                    "name": f"CSPS {row['province_name']} {idx}",
                    "facility_type": "CSPS",
                    "is_open": is_open,
                    "distance_km": round(float(rng.uniform(1.0, 25.0)), 2),
                    "services": selected_services,
                    "chw_contact": f"+226 70 {int(rng.integers(10, 99))} {int(rng.integers(10, 99))} {int(rng.integers(10, 99))}",
                }
            )

    return pd.DataFrame(records)


def generate_sample_relays() -> pd.DataFrame:
    """Provide realistic relay worker profiles for MVP portal flows."""

    return pd.DataFrame(
        [
            {
                "relay_id": "relay-kaya-01",
                "relay_name": "Awa Ouedraogo",
                "province_id": 15,
                "province_name": "Sanmatenga",
                "commune": "Kaya",
                "phone": "+22670011234",
                "assigned_households": 8,
            },
            {
                "relay_id": "relay-fada-01",
                "relay_name": "Mariam Sawadogo",
                "province_id": 24,
                "province_name": "Gourma",
                "commune": "Fada N'Gourma",
                "phone": "+22670024567",
                "assigned_households": 7,
            },
            {
                "relay_id": "relay-dori-01",
                "relay_name": "Aicha Zongo",
                "province_id": 39,
                "province_name": "Seno",
                "commune": "Dori",
                "phone": "+22670037890",
                "assigned_households": 9,
            },
        ]
    )


def generate_sample_relay_households(relay_df: pd.DataFrame) -> Dict[str, List[str]]:
    """Generate anonymous assigned household labels per relay."""

    assignments: Dict[str, List[str]] = {}
    for _, row in relay_df.iterrows():
        total = int(row["assigned_households"])
        assignments[row["relay_id"]] = [f"Household {idx}" for idx in range(1, total + 1)]
    return assignments
