"""Discovery and health endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


def test_liveness_is_public_and_not_enveloped(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_root_describes_the_service(client: TestClient) -> None:
    body = client.get("/").json()
    assert body["service"] == "StepStyle System Configuration Service"
    assert body["api_prefix"] == "/api/v1/settings"
    assert "version" in body


def test_readiness_reports_database_and_jwks(client: TestClient) -> None:
    response = client.get("/health/ready")
    body = response.json()
    assert set(body) == {"status", "checks"}
    # Both checks are reported; the test suite stubs the verifier so JWKS is "ok".
    assert body["checks"]["database"] == "ok"
    assert body["checks"]["jwks"] == "ok"
    assert body["status"] == "ok"
