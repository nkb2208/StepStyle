"""Async SQLAlchemy engine / session management for `stepstyle_db`."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any, ClassVar

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from systemconfig.config import get_settings


class Base(DeclarativeBase):
    """Declarative base for the store-configuration models."""

    # Server-managed columns (`ngay_tao`, `ngay_cap_nhat`, …) are fetched in the
    # same flush instead of being expired: lazy loading is not possible in an
    # async session, and the serializers read those timestamps immediately.
    __mapper_args__: ClassVar[dict[str, object]] = {"eager_defaults": True}


_settings = get_settings()


def _engine_kwargs() -> dict[str, Any]:
    if _settings.is_sqlite:
        # Test / tooling engine: a fresh connection per checkout avoids binding
        # an in-file aiosqlite connection to the first event loop that used it.
        return {"poolclass": NullPool}
    return {
        "pool_pre_ping": True,
        "pool_size": _settings.database_pool_size,
        "max_overflow": _settings.database_max_overflow,
    }


engine: AsyncEngine = create_async_engine(
    _settings.database_url,
    echo=_settings.database_echo,
    future=True,
    **_engine_kwargs(),
)

session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one transaction per request.

    Commits when the handler succeeded, rolls back when it raised.
    """
    async with session_factory() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise
        else:
            await session.commit()


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Programmatic variant of :func:`get_session` (scripts, tasks, tests)."""
    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except BaseException:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    await engine.dispose()
