from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID


@dataclass
class User:
    id: UUID
    username: str
    email: str
    password_hash: str
    created_at: datetime


@dataclass
class Tokens:
    access_token: str
    refresh_token: str
    access_token_id: str
    refresh_token_id: str


@dataclass
class RefreshTokenModel:
    user_id: UUID
    token_id: str
    refresh_token: str
    expires_at: datetime


@dataclass
class PasswordResetToken:
    user_id: UUID
    reset_token: str
    expires_at: datetime

    def is_expired(self) -> bool:
        return self.expires_at.replace(tzinfo=None) < datetime.utcnow()
