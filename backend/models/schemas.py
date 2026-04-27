"""Pydantic schemas for Dama FastAPI backend responses."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class VulnerabilityFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: Optional[dict] = None
    properties: Dict[str, object]


class VulnerabilityFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: List[VulnerabilityFeature]


class ProvinceDetail(BaseModel):
    province_id: int
    province_name: str
    region: str
    vulnerability_score: float
    top_risk_factor: str
    data_quality: str
    component_breakdown: Dict[str, float]
    metrics: Dict[str, float]


class RadioScriptSection(BaseModel):
    opening: str
    district_update: str
    nearest_facility: str
    services_available: str
    chw_contact: str
    srh_tip: str
    qr_announcement: str
    closing: str


class RadioScriptResponse(BaseModel):
    province_id: int
    province_name: str
    generated_at: datetime
    top_risk_factor: str
    english_script: RadioScriptSection
    french_script: RadioScriptSection
    moore_script: RadioScriptSection


class InteractionLogRequest(BaseModel):
    province_id: int = Field(..., ge=1, le=45)
    interaction_type: str = "qr_scan"
    source: str = "pwa"
    user_agent: Optional[str] = None


class InteractionLogResponse(BaseModel):
    message: str
    interaction_id: str
    logged_at: datetime


class FacilityItem(BaseModel):
    facility_id: int
    province_id: int
    province_name: str
    name: str
    facility_type: str
    is_open: bool
    distance_km: float
    services: List[str]
    chw_contact: str


class FacilityResponse(BaseModel):
    province_id: int
    facilities: List[FacilityItem]


class RelayProfile(BaseModel):
    relay_id: str
    relay_name: str
    province_id: int
    commune: str
    phone: str
    assigned_households: int


class RelaySyncResponse(BaseModel):
    relay: RelayProfile
    households: List[str]
    last_synced: datetime


class RelayVisitRequest(BaseModel):
    relay_id: str
    province_id: int = Field(..., ge=1, le=45)
    household_label: str
    srh_need_identified: bool
    referral_made: bool
    service_type: Literal["family planning", "prenatal care", "GBV support", "contraceptives", "other"]


class RelayVisitResponse(BaseModel):
    message: str
    visit_id: str
    logged_at: datetime


class FeedbackRefreshResponse(BaseModel):
    message: str
    refreshed_at: datetime
    top_priority: List[Dict[str, object]]
    interaction_summary: Dict[str, int]
