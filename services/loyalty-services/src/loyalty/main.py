"""Application factory cho StepStyle Loyalty Service (Service 2)."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from loyalty import __version__
from loyalty.bootstrap import init_loyalty_schema
from loyalty.config import get_settings
from loyalty.db import dispose_engine, engine
from loyalty.errors import register_exception_handlers
from loyalty.routers import addresses, profile

logger = logging.getLogger("loyalty")


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("Loyalty Service starting (port %s)", settings.port)
        await init_loyalty_schema(engine)
        logger.info("Tables ready, default data seeded")
        yield
        await dispose_engine()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Service 2: Profile, địa chỉ, hạng thành viên và gói VIP.",
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    app.include_router(profile.router, prefix="/api/v1")
    app.include_router(addresses.router, prefix="/api/v1")
    @app.get("/health", tags=["discovery"])
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()