"""Admin CRUD for `nguoidung` (local shop accounts).

Credentials are managed here only for rows of the shop database; the StepStyle
auth microservice still owns authentication for API access (bearer tokens).
Passwords are hashed with bcrypt and never returned.
"""

from __future__ import annotations

from typing import Any

import bcrypt
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adminfeat.common import paginated, pagination
from adminfeat.db import get_session
from adminfeat.errors import bad_request, conflict, not_found
from adminfeat.models import NguoiDung
from adminfeat.schemas import UserCreate, UserPasswordUpdate, UserUpdate
from adminfeat.security import Principal, require_permission

router = APIRouter(prefix="/users", tags=["users"])

READ = [Depends(require_permission("user:read"))]
CREATE = [Depends(require_permission("user:create"))]
UPDATE = [Depends(require_permission("user:update"))]


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def to_dict(row: NguoiDung) -> dict[str, Any]:
    return {
        "id": row.ma_nguoi_dung,
        "name": row.ho_ten,
        "email": row.email,
        "phone": row.so_dien_thoai,
        "address": row.dia_chi,
        "role": row.vai_tro,
        "active": row.trang_thai,
        "created_at": row.ngay_tao,
        "updated_at": row.ngay_cap_nhat,
    }


async def _get_or_404(session: AsyncSession, user_id: int) -> NguoiDung:
    row = await session.get(NguoiDung, user_id)
    if row is None:
        raise not_found("User")
    return row


async def _assert_email_unique(
    session: AsyncSession, email: str, exclude_id: int | None = None
) -> None:
    stmt = (
        select(func.count())
        .select_from(NguoiDung)
        .where(func.lower(NguoiDung.email) == email.lower())
    )
    if exclude_id is not None:
        stmt = stmt.where(NguoiDung.ma_nguoi_dung != exclude_id)
    if await session.scalar(stmt):
        raise conflict("DUPLICATE_EMAIL", f"Email '{email}' is already registered")


@router.get("", dependencies=READ)
async def list_users(
    session: AsyncSession = Depends(get_session),
    page_params: tuple[int, int, int] = Depends(pagination),
    role: str | None = Query(default=None, pattern="^(CUSTOMER|ADMIN|STAFF)$"),
    active: bool | None = Query(default=None),
    q: str | None = Query(default=None, description="Search by name, email or phone"),
) -> dict[str, Any]:
    page, page_size, offset = page_params
    filters = []
    if role:
        filters.append(NguoiDung.vai_tro == role)
    if active is not None:
        filters.append(NguoiDung.trang_thai.is_(active))
    if q:
        needle = f"%{q.lower()}%"
        filters.append(
            func.lower(NguoiDung.ho_ten).like(needle)
            | func.lower(NguoiDung.email).like(needle)
            | func.lower(NguoiDung.so_dien_thoai).like(needle)
        )

    total = await session.scalar(select(func.count()).select_from(NguoiDung).where(*filters))
    rows = (
        await session.execute(
            select(NguoiDung)
            .where(*filters)
            .order_by(NguoiDung.ma_nguoi_dung.desc())
            .offset(offset)
            .limit(page_size)
        )
    ).scalars()
    return paginated([to_dict(row) for row in rows], page, page_size, total or 0)


@router.post("", status_code=201, dependencies=CREATE)
async def create_user(
    payload: UserCreate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    await _assert_email_unique(session, payload.email)
    row = NguoiDung(
        ho_ten=payload.name,
        email=str(payload.email),
        mat_khau=hash_password(payload.password),
        so_dien_thoai=payload.phone,
        dia_chi=payload.address,
        vai_tro=payload.role.value,
        trang_thai=payload.active,
    )
    session.add(row)
    await session.flush()
    return {"user": to_dict(row)}


@router.get("/{user_id}", dependencies=READ)
async def get_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    return {"user": to_dict(await _get_or_404(session, user_id))}


@router.patch("/{user_id}", dependencies=UPDATE)
async def update_user(
    user_id: int,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, user_id)
    data = payload.model_dump(exclude_unset=True)

    if "email" in data:
        await _assert_email_unique(session, data["email"], exclude_id=user_id)

    if "name" in data:
        row.ho_ten = data["name"]
    if "email" in data:
        row.email = str(data["email"])
    if "phone" in data:
        row.so_dien_thoai = data["phone"]
    if "address" in data:
        row.dia_chi = data["address"]
    if "role" in data:
        row.vai_tro = data["role"].value
    if "active" in data:
        row.trang_thai = data["active"]

    await session.flush()
    return {"user": to_dict(row)}


@router.post("/{user_id}/password", dependencies=UPDATE)
async def reset_user_password(
    user_id: int,
    payload: UserPasswordUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict[str, Any]:
    row = await _get_or_404(session, user_id)
    row.mat_khau = hash_password(payload.password)
    await session.flush()
    return {"message": "Password updated", "id": user_id}


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    session: AsyncSession = Depends(get_session),
    # Inline dependency: the principal is needed for the self-delete guard.
    principal: Principal = Depends(require_permission("user:delete")),
) -> dict[str, Any]:
    own_id = principal.user_id
    if own_id and own_id.isdigit() and int(own_id) == user_id:
        raise bad_request("SELF_DELETE", "You cannot delete your own account")

    row = await _get_or_404(session, user_id)
    await session.delete(row)
    await session.flush()
    return {"message": "User deleted", "id": user_id}
