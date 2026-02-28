from typing import Optional
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status

from app.infrastructure.database import get_db
from app.infrastructure.database.repositories import (
    UserRepository,
    RefreshTokenRepository,
    AccessTokenRepository,
    PasswordResetRepository,
    QueryRepository,
    QueryResponseRepository,
)
from app.infrastructure.email import SMTPSender
from app.application import AuthService, PasswordResetService, QueryService
from app.shared import jwt_service, InvalidTokenError, TokenRevokedError


@dataclass
class CurrentUser:
    user_id: str
    token_id: str


async def get_user_repo(session=Depends(get_db)):
    return UserRepository(session)


async def get_refresh_token_repo(session=Depends(get_db)):
    return RefreshTokenRepository(session)


async def get_access_token_repo():
    return AccessTokenRepository()


async def get_password_reset_repo(session=Depends(get_db)):
    return PasswordResetRepository(session)


async def get_email_sender():
    return SMTPSender()


async def get_auth_service(
    user_repo=Depends(get_user_repo),
    refresh_token_repo=Depends(get_refresh_token_repo),
    access_token_repo=Depends(get_access_token_repo),
):
    return AuthService(user_repo, refresh_token_repo, access_token_repo)


async def get_password_reset_service(
    password_reset_repo=Depends(get_password_reset_repo),
    user_repo=Depends(get_user_repo),
    email_sender=Depends(get_email_sender),
):
    return PasswordResetService(password_reset_repo, user_repo, email_sender)


async def get_query_repo(session=Depends(get_db)):
    return QueryRepository(session)


async def get_query_response_repo(session=Depends(get_db)):
    return QueryResponseRepository(session)


async def get_query_service(
    query_repo=Depends(get_query_repo),
    query_response_repo=Depends(get_query_response_repo),
):
    return QueryService(query_repo, query_response_repo)


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    access_token_repo=Depends(get_access_token_repo),
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
            detail="Invalid or expired token",
        )

    token_id = payload.get("jti")
    is_revoked = await access_token_repo.is_revoked(token_id)
    if is_revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    return CurrentUser(user_id=user_id, token_id=token_id)
