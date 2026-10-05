"""Uniform HTTP error envelope shared with the StepStyle auth service.

Every failure body looks like::

    {"success": false, "error": {"code": "NOT_FOUND", "message": "..."}}
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("adminfeat.errors")


def failure(code: str, message: str, *, details: Any = None) -> dict[str, Any]:
    body: dict[str, Any] = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return {"success": False, "error": body}


class ApiError(Exception):
    """Application-level error carrying a status, a stable code and a message."""

    def __init__(self, status_code: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


def unauthorized(code: str, message: str) -> ApiError:
    return ApiError(401, code, message)


def forbidden(message: str = "Insufficient permissions for this resource") -> ApiError:
    return ApiError(403, "FORBIDDEN", message)


def not_found(resource: str) -> ApiError:
    return ApiError(404, "NOT_FOUND", f"{resource} not found")


def bad_request(code: str, message: str) -> ApiError:
    return ApiError(400, code, message)


def conflict(code: str, message: str) -> ApiError:
    return ApiError(409, code, message)


async def api_error_handler(_request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content=failure(exc.code, exc.message),
    )


async def validation_error_handler(_request, exc: RequestValidationError) -> JSONResponse:
    details = [
        {
            "field": ".".join(str(part) for part in error.get("loc", ())),
            "message": error.get("msg", ""),
            "type": error.get("type", ""),
        }
        for error in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=failure("VALIDATION_ERROR", "Request validation failed", details=details),
    )


async def http_exception_handler(_request, exc: HTTPException) -> JSONResponse:
    code = getattr(exc, "code", None) or _http_code_for(exc.status_code)
    detail = exc.detail if isinstance(exc.detail, str) else _http_code_for(exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content=failure(code, detail),
        headers=getattr(exc, "headers", None),
    )


async def integrity_error_handler(_request, exc: IntegrityError) -> JSONResponse:
    logger.info("Database integrity constraint violated: %s", exc.orig)
    return JSONResponse(
        status_code=409,
        content=failure(
            "CONFLICT",
            "The request conflicts with existing data (duplicate value or referenced record)",
        ),
    )


async def sqlalchemy_error_handler(_request, exc: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database error: %s", exc)
    return JSONResponse(
        status_code=500,
        content=failure("INTERNAL_ERROR", "An unexpected database error occurred"),
    )


def _http_code_for(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "VALIDATION_ERROR",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_ERROR",
        503: "SERVICE_UNAVAILABLE",
    }.get(status_code, "ERROR")


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, api_error_handler)
    app.add_exception_handler(RequestValidationError, validation_error_handler)
    # Starlette's HTTPException covers FastAPI's subclass too (MRO lookup) and
    # also catches router-level 404/405 raised before FastAPI's own handler.
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(IntegrityError, integrity_error_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_error_handler)
