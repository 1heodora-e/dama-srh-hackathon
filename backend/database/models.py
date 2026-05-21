"""SQLAlchemy ORM models for Dama PostgreSQL storage."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Province(Base):
    __tablename__ = "provinces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    region: Mapped[str] = mapped_column(String(100), nullable=False)
    conflict_affected: Mapped[bool] = mapped_column(Boolean, default=False)


class ProvinceIndicator(Base):
    __tablename__ = "province_indicators"

    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), primary_key=True)
    indicators: Mapped[dict] = mapped_column(JSONB, nullable=False)


class VulnerabilityScore(Base):
    __tablename__ = "vulnerability_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), unique=True, index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    top_risk_factor: Mapped[str] = mapped_column(String(80), nullable=False)
    data_quality: Mapped[str] = mapped_column(String(20), default="estimated")
    component_breakdown: Mapped[dict] = mapped_column(JSONB, nullable=False)
    metrics: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Facility(Base):
    __tablename__ = "facilities"

    facility_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), index=True)
    province_name: Mapped[str] = mapped_column(String(100), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    facility_type: Mapped[str] = mapped_column(String(50), default="CSPS")
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    services: Mapped[list] = mapped_column(JSONB, nullable=False)
    chw_contact: Mapped[str] = mapped_column(String(40), nullable=False)


class Relay(Base):
    __tablename__ = "relays"

    relay_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    relay_name: Mapped[str] = mapped_column(String(200), nullable=False)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), index=True)
    commune: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str] = mapped_column(String(30), nullable=False)
    assigned_households: Mapped[int] = mapped_column(Integer, default=0)

    households: Mapped[list["RelayHousehold"]] = relationship(back_populates="relay")


class RelayHousehold(Base):
    __tablename__ = "relay_households"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    relay_id: Mapped[str] = mapped_column(String(64), ForeignKey("relays.relay_id"), index=True)
    household_label: Mapped[str] = mapped_column(String(120), nullable=False)

    relay: Mapped["Relay"] = relationship(back_populates="households")


class InteractionLog(Base):
    __tablename__ = "interaction_logs"

    interaction_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), index=True)
    interaction_type: Mapped[str] = mapped_column(String(50), default="qr_scan")
    source: Mapped[str] = mapped_column(String(50), default="pwa")
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class RelayVisit(Base):
    __tablename__ = "relay_visits"

    visit_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    relay_id: Mapped[str] = mapped_column(String(64), ForeignKey("relays.relay_id"), index=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), index=True)
    household_label: Mapped[str] = mapped_column(String(120), nullable=False)
    srh_need_identified: Mapped[bool] = mapped_column(Boolean, default=False)
    referral_made: Mapped[bool] = mapped_column(Boolean, default=False)
    service_type: Mapped[str] = mapped_column(String(80), nullable=False)
    logged_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class ScoreHistory(Base):
    __tablename__ = "score_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    province_id: Mapped[int] = mapped_column(Integer, ForeignKey("provinces.id"), index=True)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
