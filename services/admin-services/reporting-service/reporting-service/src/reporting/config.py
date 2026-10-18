from __future__ import annotations

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Core settings
    app_name: str = "StepStyle Analytics & Reporting Service"
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 4006
    log_level: str = "info"

    # Database settings
    database_url: str = "mysql+aiomysql://root:root@localhost:3306/stepstyle_db"
    database_pool_size: int = 5
    database_max_overflow: int = 10
    database_echo: bool = False

    # Auth integration
    jwks_url: str = "http://localhost:4000/.well-known/jwks.json"
    jwt_issuer: str = "auth.yourdomain.com"
    jwt_audience: str = "api.yourdomain.com"

    # HTTP & CORS
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://localhost:4000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
