"""Fixtures dùng chung. Test chạy KHÔNG cần MySQL hay IAM.

DATABASE_URL trỏ tới file SQLite tạm TRƯỚC khi import app. Việc đăng nhập
được giả lập bằng cách ghi đè dependency get_current_user.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

_TMP = Path(__file__).resolve().parent / ".tmp"
shutil.rmtree(_TMP, ignore_errors=True)
_TMP.mkdir(parents=True, exist_ok=True)

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{(_TMP / 'test.db').as_posix()}"
os.environ["JWKS_URL"] = "http://127.0.0.1:9/.well-known/jwks.json"
os.environ["JWKS_FAIL_FAST"] = "false"
os.environ["ENVIRONMENT"] = "test"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from loyalty.main import app  # noqa: E402
from loyalty.security import CurrentUser, get_current_user  # noqa: E402

_current: dict = {"user": None}


def _make_user(sub: str) -> CurrentUser:
    return CurrentUser(
        sub=sub, email=f"{sub}@test.com", role="CUSTOMER", email_verified=True, token="fake"
    )


@pytest.fixture(scope="session")
def client():
    app.dependency_overrides[get_current_user] = lambda: _current["user"]
    with TestClient(app) as c:  # chạy lifespan: tạo bảng + seed hạng/gói
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def login_as():
    """login_as("user-a") để giả lập đăng nhập bằng user có sub = user-a."""

    def _login(sub: str) -> None:
        _current["user"] = _make_user(sub)

    return _login


@pytest.fixture(autouse=True)
def stub_iam(monkeypatch):
    """Không gọi IAM thật khi lazy-create profile."""

    async def fake_fetch_me(_token: str):
        return {"email": "tester@test.com", "name": "Tester"}

    monkeypatch.setattr("loyalty.services.profile_service.fetch_me", fake_fetch_me)