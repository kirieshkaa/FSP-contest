from typing import Optional

from fastapi import APIRouter, Response, Depends, HTTPException, status, Cookie, Request

from app.config import get_config
from app.application import AuthService
from app.presentation.deps import get_auth_service
from app.presentation.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    RefreshResponse,
    LogoutResponse,
)


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=RegisterResponse)
async def register(
    request: Request,
    response: Response,
    body: RegisterRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    try:
        tokens = await auth_service.register(
            username=body.username,
            email=body.email,
            password=body.password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    _set_refresh_token_cookie(response, tokens.refresh_token)

    return RegisterResponse(access_token=tokens.access_token)


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    response: Response,
    body: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    if not body.has_credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email is required",
        )

    try:
        tokens = await auth_service.login(
            username=body.username,
            email=body.email,
            password=body.password,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    _set_refresh_token_cookie(response, tokens.refresh_token)

    return LoginResponse(access_token=tokens.access_token)


@router.get("/refresh", response_model=RefreshResponse)
async def refresh(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
):
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    try:
        tokens = await auth_service.refresh(refresh_token)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    _set_refresh_token_cookie(response, tokens.refresh_token)

    return RefreshResponse(access_token=tokens.access_token)


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    response: Response,
    refresh_token: Optional[str] = Cookie(None),
    auth_service: AuthService = Depends(get_auth_service),
):
    if refresh_token:
        try:
            await auth_service.logout(refresh_token)
        except Exception:
            pass

    _clear_refresh_token_cookie(response)

    return LogoutResponse(ok=True)


def _set_refresh_token_cookie(response: Response, refresh_token: str):
    config = get_config()
    max_age = config.tokens.refresh_token.expiry_days * 24 * 60 * 60

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=max_age,
        path="/api/v1/auth",
        domain=config.security.cookie_domain,
        secure=config.security.cookie_secure,
        httponly=True,
        samesite=config.security.cookie_same_site,
    )


def _clear_refresh_token_cookie(response: Response):
    config = get_config()

    response.set_cookie(
        key="refresh_token",
        value="",
        max_age=0,
        path="/api/v1/auth",
        domain=config.security.cookie_domain,
        secure=config.security.cookie_secure,
        httponly=True,
        samesite=config.security.cookie_same_site,
    )
