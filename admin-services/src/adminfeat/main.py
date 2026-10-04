"""Application factory for the StepStyle admin microservice."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from adminfeat import __version__
from adminfeat.config import get_settings
from adminfeat.db import dispose_engine, engine
from adminfeat.errors import register_exception_handlers
from adminfeat.routers import (
    categories,
    dashboard,
    discounts,
    orders,
    payment_methods,
    payments,
    products,
    users,
    variants,
)
from adminfeat.security import Principal, authenticate, get_verifier

logger = logging.getLogger("adminfeat")

API_PREFIX = "/api/admin"


def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Fail fast on a misconfigured JWKS endpoint, mirroring the auth
        # monorepo's downstream services (opt-out via JWKS_FAIL_FAST=false).
        try:
            await get_verifier().init()
            logger.info("JWKS loaded from %s", settings.jwks_url)
        except Exception as exc:
            if settings.jwks_fail_fast:
                raise
            logger.warning("JWKS prefetch failed (%s); will retry on demand", exc)
        yield
        await dispose_engine()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Admin microservice for the StepStyle shop. "
            "Authenticates stateless RS256 JWTs issued by the StepStyle auth "
            "service (JWKS) and provides CRUD over the `stepstyle_db` schema."
        ),
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

    @app.middleware("http")
    async def success_envelope(request: Request, call_next):
        """Wrap every 2xx JSON body of the API as ``{"success": true, "data": …}``.

        Error bodies are already enveloped by :mod:`adminfeat.errors`, so only
        successful payloads need normalising. Discovery endpoints (`/`, health)
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

    app.include_router(categories.router, prefix=API_PREFIX)
    app.include_router(products.router, prefix=API_PREFIX)
    app.include_router(variants.router, prefix=API_PREFIX)
    app.include_router(discounts.router, prefix=API_PREFIX)
    app.include_router(payment_methods.router, prefix=API_PREFIX)
    app.include_router(orders.router, prefix=API_PREFIX)
    app.include_router(payments.router, prefix=API_PREFIX)
    app.include_router(users.router, prefix=API_PREFIX)
    app.include_router(dashboard.router, prefix=API_PREFIX)

    @app.get("/", tags=["discovery"])
    async def root() -> dict:
        return {
            "service": settings.app_name,
            "version": __version__,
            "api_prefix": API_PREFIX,
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
        except Exception as exc:
            checks["database"] = f"error: {exc.__class__.__name__}"
            status_code = 503
        try:
            await get_verifier().init()
            checks["jwks"] = "ok"
        except Exception as exc:
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
    """Console entry point (``uv run adminfeat``)."""
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "adminfeat.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level,
    )


if __name__ == "__main__":
    main()
