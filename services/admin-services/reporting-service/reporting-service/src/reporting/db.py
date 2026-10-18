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

from reporting.config import get_settings


class Base(DeclarativeBase):
    __mapper_args__: ClassVar[dict[str, object]] = {"eager_defaults": True}


_settings = get_settings()


def _engine_kwargs() -> dict[str, Any]:
    if _settings.is_sqlite:
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


# Dependency: Database session
async def get_session() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    async with session_factory() as session:
        try:
            yield session
        except BaseException:
            await session.rollback()
            raise


async def dispose_engine() -> None:
    await engine.dispose()
