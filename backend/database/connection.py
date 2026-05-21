"""Database engine and session factory."""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Generator, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

_engine: Optional[Engine] = None
_SessionLocal: Optional[sessionmaker] = None


def get_database_url() -> Optional[str]:
    url = os.getenv("DATABASE_URL", "").strip()
    if not url:
        return None
    # Render/Heroku use postgres:// — SQLAlchemy 2 prefers postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    # Render Postgres requires SSL for external and most internal connections
    if "sslmode=" not in url:
        separator = "&" if "?" in url else "?"
        url = f"{url}{separator}sslmode=require"
    return url


def is_database_enabled() -> bool:
    return get_database_url() is not None


def get_engine() -> Engine:
    global _engine, _SessionLocal
    if _engine is None:
        url = get_database_url()
        if not url:
            raise RuntimeError("DATABASE_URL is not set.")
        _engine = create_engine(url, pool_pre_ping=True)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
    return _engine


def get_session_factory() -> sessionmaker:
    get_engine()
    assert _SessionLocal is not None
    return _SessionLocal


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    factory = get_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
