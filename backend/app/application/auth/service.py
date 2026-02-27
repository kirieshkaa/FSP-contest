import re
from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_config
from app.domain.entities import User, Tokens, RefreshTokenModel
from app.domain.interfaces import (
    IUserRepository,
    IRefreshTokenRepository,
    IAccessTokenRepository,
)
from app.shared import (
    hash_password,
    verify_password,
    jwt_service,
    InvalidEmailError,
    UserAlreadyExistsError,
    UserNotFoundError,
    InvalidCredentialsError,
    InvalidTokenError,
    TokenRevokedError,
)


class AuthService:
    def __init__(
        self,
        user_repo: IUserRepository,
        refresh_token_repo: IRefreshTokenRepository,
        access_token_repo: IAccessTokenRepository,
    ):
        self._user_repo = user_repo
        self._refresh_token_repo = refresh_token_repo
        self._access_token_repo = access_token_repo

    def _validate_email(self, email: str) -> None:
        pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(pattern, email):
            raise InvalidEmailError()

    async def register(self, username: str, email: str, password: str) -> Tokens:
        self._validate_email(email)

        existing_user = await self._user_repo.get_by_username(username)
        if existing_user:
            raise UserAlreadyExistsError("username")

        existing_user = await self._user_repo.get_by_email(email)
        if existing_user:
            raise UserAlreadyExistsError("email")

        password_hash = hash_password(password)

        user = User(
            id=uuid4(),
            username=username,
            email=email,
            password_hash=password_hash,
            created_at=datetime.now(timezone.utc),
        )

        created_user = await self._user_repo.create(user)

        return await self._create_tokens(created_user.id)

    async def login(
        self, username: Optional[str], email: Optional[str], password: str
    ) -> Tokens:
        user: Optional[User] = None

        if email:
            self._validate_email(email)
            user = await self._user_repo.get_by_email(email)
        elif username:
            user = await self._user_repo.get_by_username(username)
        else:
            raise InvalidCredentialsError()

        if not user:
            raise UserNotFoundError()

        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        return await self._create_tokens(user.id)

    async def refresh(self, refresh_token: str) -> Tokens:
        payload = jwt_service.verify_refresh_token(refresh_token)
        if not payload:
            raise InvalidTokenError()

        user_id_str = payload.get("user_id")
        user_id = UUID(user_id_str)

        stored_token = await self._refresh_token_repo.get_and_delete(refresh_token)
        if not stored_token:
            raise InvalidTokenError()

        return await self._create_tokens(user_id)

    async def logout(self, refresh_token: str) -> None:
        payload = jwt_service.verify_refresh_token(refresh_token)
        if payload:
            await self._refresh_token_repo.delete(refresh_token)

    async def _create_tokens(self, user_id: UUID) -> Tokens:
        user_id_str = str(user_id)
        access_token, access_token_id = jwt_service.create_access_token(user_id_str)
        refresh_token, refresh_token_id = jwt_service.create_refresh_token(user_id_str)

        config = get_config()
        expires_at = datetime.now(timezone.utc) + timedelta(
            days=config.tokens.refresh_token.expiry_days
        )

        refresh_token_model = RefreshTokenModel(
            user_id=user_id,
            token_id=refresh_token_id,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        await self._refresh_token_repo.create(refresh_token_model)

        return Tokens(
            access_token=access_token,
            refresh_token=refresh_token,
            access_token_id=access_token_id,
            refresh_token_id=refresh_token_id,
        )
