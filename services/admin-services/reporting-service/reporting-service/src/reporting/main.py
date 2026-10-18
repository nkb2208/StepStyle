from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from sqlalchemy import text

from reporting import __version__
from reporting.config import get_settings
from reporting.db import dispose_engine, engine
from reporting.errors import register_exception_handlers
from reporting.routers import reports

logger = logging.getLogger("reporting")

API_PREFIX = "/api/v1"


# Application Factory
def create_app() -> FastAPI:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("Reporting Service starting on port %s", settings.port)
        yield
        await dispose_engine()

    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description="Microservice Báo cáo & Thống kê doanh thu, đơn hàng của StepStyle.",
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

    # Response Envelope Middleware
    @app.middleware("http")
    async def success_envelope(request: Request, call_next):
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

    app.include_router(reports.router, prefix=API_PREFIX)

    # System Endpoints
    @app.get("/", tags=["discovery"])
    async def root() -> dict:
        return {
            "service": settings.app_name,
            "version": __version__,
            "api_prefix": f"{API_PREFIX}/reports",
            "docs": "/docs",
        }

    @app.get("/health", tags=["discovery"])
    async def health() -> dict:
        return {"status": "ok"}

    @app.get("/health/ready", tags=["discovery"])
    async def ready() -> JSONResponse:
        checks: dict[str, str] = {}
        status_code = 200
        try:
            async with engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
            checks["database"] = "ok"
        except Exception as exc:
            checks["database"] = f"error: {exc.__class__.__name__}"
            status_code = 503

        body = {"status": "ok" if status_code == 200 else "degraded", "checks": checks}
        return JSONResponse(status_code=status_code, content=body)

    return app


app = create_app()


def main() -> None:
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "reporting.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level,
    )


if __name__ == "__main__":
    main()
