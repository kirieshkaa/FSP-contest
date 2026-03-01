from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query, Header

from app.application import AuthService
from app.presentation.deps import get_auth_service, get_current_user_id, CurrentUser
from app.presentation.schemas import UserResponse, UserListResponse
from app.infrastructure.database.models import UserStatus
from app.shared import jwt_service


router = APIRouter(prefix="/admin", tags=["admin"])


async def get_current_admin(
    authorization: Optional[str] = Header(None),
    current_user: CurrentUser = Depends(get_current_user_id),
) -> CurrentUser:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header",
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
        )

    token = parts[1]
    payload = jwt_service.verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    role = payload.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return current_user


@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status_filter: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    status_enum = None
    if status_filter:
        try:
            status_enum = UserStatus(status_filter)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status. Must be one of: {[s.value for s in UserStatus]}",
            )

    users, total = await user_repo.get_all(page, limit, status_enum)

    return UserListResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        limit=limit,
    )


@router.post("/users/{user_id}/approve")
async def approve_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status",
        )

    await user_repo.update_status(user_id, UserStatus.APPROVED)

    return {"ok": True, "message": "User approved"}


@router.post("/users/{user_id}/reject")
async def reject_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status",
        )

    await user_repo.update_status(user_id, UserStatus.REJECTED)

    return {"ok": True, "message": "User rejected"}


@router.post("/users/{user_id}/block")
async def block_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status",
        )

    await user_repo.update_status(user_id, UserStatus.BLOCKED)

    return {"ok": True, "message": "User blocked"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself",
        )

    await user_repo.delete(user_id)

    return {"ok": True, "message": "User deleted"}


@router.post("/users/{user_id}/unblock")
async def unblock_user(
    user_id: str,
    current_user: CurrentUser = Depends(get_current_admin),
    auth_service: AuthService = Depends(get_auth_service),
):
    user_repo = auth_service._user_repo

    user = await user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own status",
        )

    await user_repo.update_status(user_id, UserStatus.APPROVED)

    return {"ok": True, "message": "User unblocked"}
