from datetime import datetime
from uuid import uuid4
from typing import Optional
from enum import Enum as PyEnum

from sqlalchemy import String, DateTime, func, ForeignKey, JSON, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.infrastructure.database.postgres import Base


class UserRole(str, PyEnum):
    USER = "user"
    ADMIN = "admin"


class UserStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    BLOCKED = "blocked"


class UserModel(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "auth_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, name="user_id"
    )
    username: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, name="user_name"
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, name="user_email"
    )
    password_hash: Mapped[str] = mapped_column(
        String(255), nullable=False, name="user_password"
    )
    role: Mapped[UserRole] = mapped_column(
        Enum(
            UserRole, native_enum=False, values_callable=lambda x: [e.value for e in x]
        ),
        nullable=False,
        default=UserRole.USER,
        name="role",
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(
            UserStatus,
            native_enum=False,
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=UserStatus.PENDING,
        name="status",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class RefreshTokenModel(Base):
    __tablename__ = "refresh_tokens"
    __table_args__ = {"schema": "auth_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
        name="refresh_token_id",
    )
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    refresh_token: Mapped[str] = mapped_column(String(512), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class PasswordResetTokenModel(Base):
    __tablename__ = "password_reset_tokens"
    __table_args__ = {"schema": "auth_service"}

    id: Mapped[int] = mapped_column(
        primary_key=True, autoincrement=True, name="reset_token_id"
    )
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    reset_token: Mapped[str] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class QueryModel(Base):
    __tablename__ = "queries"
    __table_args__ = {"schema": "query_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, name="query_id"
    )
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    query_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class QueryResponseModel(Base):
    __tablename__ = "query_responses"
    __table_args__ = {"schema": "query_service"}

    id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid4, name="response_id"
    )
    query_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    response_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
