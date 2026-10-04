"""Environment-driven configuration for the StepStyle admin microservice."""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Core ────────────────────────────────────────────────────────────────
    app_name: str = "StepStyle Admin Service"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 4004
    log_level: str = "info"

    # ── Database (MySQL schema from StepStyle-v2.sql) ───────────────────────
    database_url: str = "mysql+aiomysql://root:root@localhost:3306/stepstyle_db"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_echo: bool = False

    # ── Auth microservice integration (StepStyle) ───────────────────────────
    jwks_url: str = "http://localhost:4000/.well-known/jwks.json"
    jwt_issuer: str = "auth.yourdomain.com"
    jwt_audience: str = "api.yourdomain.com"
    jwks_timeout_seconds: float = 5.0
    jwks_refresh_seconds: int = 60
    clock_tolerance_seconds: int = 5
    # Fail fast at boot when the auth service is unreachable (mirrors the
    # downstream services of the auth monorepo). Disabled by default so the
    # admin API can start while the auth service is being bootstrapped.
    jwks_fail_fast: bool = False

    # ── HTTP ────────────────────────────────────────────────────────────────
    # Comma-separated list, parsed by `cors_origin_list`.
    cors_origins: str = "http://localhost:3000,http://localhost:4000"
    page_size_default: int = 20
    page_size_max: int = 100

    # ── Business rules ──────────────────────────────────────────────────────
    # Variants at or below this stock level are reported as "low stock".
    low_stock_threshold: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
