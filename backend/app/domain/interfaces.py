from abc import ABC, abstractmethod
from typing import Optional

from app.domain.entities import User, RefreshTokenModel, PasswordResetToken


class IUserRepository(ABC):
    @abstractmethod
    async def create(self, user: User) -> User:
        pass

    @abstractmethod
    async def get_by_id(self, user_id: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_username(self, username: str) -> Optional[User]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str) -> Optional[User]:
        pass

    @abstractmethod
    async def update_password(self, user_id: str, password_hash: str) -> None:
        pass


class IRefreshTokenRepository(ABC):
    @abstractmethod
    async def create(self, token: RefreshTokenModel) -> None:
        pass

    @abstractmethod
    async def get(self, token: str) -> Optional[str]:
        pass

    @abstractmethod
    async def get_and_delete(self, token: str) -> Optional[str]:
        pass

    @abstractmethod
    async def delete(self, token: str) -> None:
        pass

    @abstractmethod
    async def delete_expired(self) -> None:
        pass


class IAccessTokenRepository(ABC):
    @abstractmethod
    async def revoke(self, token_id: str, expiry_seconds: int) -> None:
        pass

    @abstractmethod
    async def is_revoked(self, token_id: str) -> bool:
        pass


class IPasswordResetRepository(ABC):
    @abstractmethod
    async def create(self, token: PasswordResetToken) -> None:
        pass

    @abstractmethod
    async def get(self, token: str) -> Optional[PasswordResetToken]:
        pass

    @abstractmethod
    async def delete(self, token: str) -> None:
        pass

    @abstractmethod
    async def delete_expired(self) -> None:
        pass


class IEmailSender(ABC):
    @abstractmethod
    async def send_password_reset_email(self, to_email: str, reset_link: str) -> None:
        pass
