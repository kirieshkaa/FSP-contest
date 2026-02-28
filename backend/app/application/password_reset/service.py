import logging
import secrets
import asyncio
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.config import get_config
from app.domain.entities import PasswordResetToken
from app.domain.interfaces import (
    IPasswordResetRepository,
    IUserRepository,
    IEmailSender,
)
from app.shared import (
    hash_password,
    InvalidEmailError,
    UserNotFoundError,
    InvalidTokenError,
)


logger = logging.getLogger(__name__)


class PasswordResetService:
    def __init__(
        self,
        password_reset_repo: IPasswordResetRepository,
        user_repo: IUserRepository,
        email_sender: IEmailSender,
    ):
        self._password_reset_repo = password_reset_repo
        self._user_repo = user_repo
        self._email_sender = email_sender

    def _generate_token(self) -> str:
        return str(uuid4())

    async def request_reset(self, email: str) -> None:
        await asyncio.sleep(1)

        user = await self._user_repo.get_by_email(email)
        if not user:
            return

        token = self._generate_token()
        config = get_config()
        expires_at = datetime.now(timezone.utc) + timedelta(
            hours=config.password_reset.token_expiry_hours
        )

        password_reset_token = PasswordResetToken(
            user_id=user.id,
            reset_token=token,
            expires_at=expires_at,
        )
        await self._password_reset_repo.create(password_reset_token)

        reset_link = f"{config.security.reset_link_base_url}/{token}"
        try:
            await self._email_sender.send_password_reset_email(email, reset_link)
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")
            raise Exception(f"Failed to send email: {e}")

    async def update_password(self, token: str, new_password: str) -> None:
        password_reset_token = await self._password_reset_repo.get(token)

        if not password_reset_token:
            raise InvalidTokenError()

        if password_reset_token.is_expired():
            await self._password_reset_repo.delete(token)
            raise InvalidTokenError()

        password_hash = hash_password(new_password)
        await self._user_repo.update_password(
            password_reset_token.user_id, password_hash
        )
        await self._password_reset_repo.delete(token)
