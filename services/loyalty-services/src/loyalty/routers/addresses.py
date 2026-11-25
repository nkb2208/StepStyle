"""Endpoints sổ địa chỉ của chính người dùng: /users/me/addresses."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from loyalty.db import get_session
from loyalty.schemas import AddressCreate, AddressOut, AddressUpdate
from loyalty.security import CurrentUser, get_current_user
from loyalty.services.address_service import AddressService

router = APIRouter(prefix="/users/me/addresses", tags=["addresses"])


def get_service(session: AsyncSession = Depends(get_session)) -> AddressService:
    return AddressService(session)


@router.get("", response_model=list[AddressOut], summary="Danh sách địa chỉ của tôi")
async def list_addresses(
    user: CurrentUser = Depends(get_current_user),
    svc: AddressService = Depends(get_service),
):
    return await svc.list_addresses(user)


@router.post("", response_model=AddressOut, status_code=201, summary="Thêm địa chỉ")
async def create_address(
    body: AddressCreate,
    user: CurrentUser = Depends(get_current_user),
    svc: AddressService = Depends(get_service),
):
    return await svc.create_address(user, body)


@router.put("/{address_id}", response_model=AddressOut, summary="Sửa địa chỉ")
async def update_address(
    address_id: int,
    body: AddressUpdate,
    user: CurrentUser = Depends(get_current_user),
    svc: AddressService = Depends(get_service),
):
    return await svc.update_address(user, address_id, body)


@router.put("/{address_id}/default", response_model=AddressOut, summary="Đặt làm mặc định")
async def set_default_address(
    address_id: int,
    user: CurrentUser = Depends(get_current_user),
    svc: AddressService = Depends(get_service),
):
    return await svc.set_default(user, address_id)


@router.delete("/{address_id}", status_code=204, summary="Xóa địa chỉ")
async def delete_address(
    address_id: int,
    user: CurrentUser = Depends(get_current_user),
    svc: AddressService = Depends(get_service),
) -> None:
    await svc.delete_address(user, address_id)