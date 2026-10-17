"""Application factory for the StepStyle System Configuration Service."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from systemconfig import __version__
from systemconfig.config import get_settings
from systemconfig.db import dispose_engine, engine
from systemconfig.errors import register_exception_handlers
from systemconfig.routers import settings
from systemconfig.security import Principal, authenticate, get_verifier

logger = logging.getLogger("systemconfig")

API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    settings_config = get_settings()
    logging.basicConfig(
        level=settings_config.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Fail fast on a misconfigured JWKS endpoint in production
        # (opt-out via JWKS_FAIL_FAST=false).
        try:
            await get_verifier().init()
            logger.info("JWKS loaded from %s", settings_config.jwks_url)
        except Exception as exc:  # a degraded start is allowed when not fail-fast
            if settings_config.jwks_fail_fast:
                raise
            logger.warning("JWKS prefetch failed (%s); will retry on demand", exc)
        yield
        await dispose_engine()

    app = FastAPI(
        title=settings_config.app_name,
        version=__version__,
        description=(
            "Admin-only microservice that owns the store configuration of the "
            "StepStyle shop: store information, payment-method toggles and "
            "shipping-carrier toggles. Authenticates stateless RS256 JWTs "
            "issued by the StepStyle auth service (JWKS)."
        ),
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings_config.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)

    @app.middleware("http")
    async def success_envelope(request: Request, call_next):
        """Wrap every 2xx JSON body of the API as ``{"success": true, "data": …}``.

        Error bodies are already enveloped by :mod:`systemconfig.errors`, so only
        successful payloads need normalising. Discovery endpoints (``/``, health)
        and the OpenAPI documents stay untouched for tooling compatibility.
        """
        response = await call_next(request)
        if (
            response.status_code >= 300
            or not request.url.path.startswith(API_PREFIX)
            or "application/json" not in response.headers.get("content-type", "")
        ):
            return response

        raw = b"".join([chunk async for chunk in response.body_iterator])
        try:
            payload = json.loads(raw)
        except ValueError:
            return Response(
                content=raw,
                status_code=response.status_code,
                headers=dict(response.headers),
            )

        wrapped = (
            payload
            if isinstance(payload, dict) and payload.get("success") is True
            else {"success": True, "data": payload}
        )
        headers = {
            key: value
            for key, value in response.headers.items()
            if key.lower() not in {"content-length", "content-type"}
        }
        return JSONResponse(content=wrapped, status_code=response.status_code, headers=headers)

    app.include_router(settings.router, prefix=API_PREFIX)

    @app.get("/", tags=["discovery"])
    async def root() -> dict:
        return {
            "service": settings_config.app_name,
            "version": __version__,
            "api_prefix": f"{API_PREFIX}/settings",
            "docs": "/docs",
        }

    @app.get("/health", tags=["discovery"])
    async def health() -> dict:
        """Liveness — no dependencies on the database or the auth service."""
        return {"status": "ok"}

    @app.get("/health/ready", tags=["discovery"])
    async def ready() -> JSONResponse:
        """Readiness — database round-trip + JWKS availability."""
        checks: dict[str, str] = {}
        status_code = 200
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as exc:  # report the class only, never the message
            checks["database"] = f"error: {exc.__class__.__name__}"
            status_code = 503
        try:
            await get_verifier().init()
            checks["jwks"] = "ok"
        except Exception as exc:  # report the class only, never the message
            checks["jwks"] = f"error: {exc.__class__.__name__}"
            status_code = 503
        body = {"status": "ok" if status_code == 200 else "degraded", "checks": checks}
        return JSONResponse(status_code=status_code, content=body)

    @app.get(f"{API_PREFIX}/me", tags=["identity"])
    async def me(principal: Principal = Depends(authenticate)) -> dict:
        """Echo of the verified principal — handy when debugging tokens."""
        return {
            "principal": {
                "type": principal.type,
                "user_id": principal.user_id,
                "client_id": principal.client_id,
                "role": principal.role,
                "permissions": list(principal.permissions),
                "email_verified": principal.email_verified,
            }
        }

    return app


app = create_app()


def main() -> None:
    """Console entry point (``systemconfig``)."""
    import uvicorn

    settings_config = get_settings()
    uvicorn.run(
        "systemconfig.main:app",
        host=settings_config.host,
        port=settings_config.port,
        reload=settings_config.environment == "development",
        log_level=settings_config.log_level,
    )


if __name__ == "__main__":
    main()
