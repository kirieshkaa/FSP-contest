from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import select, update, delete, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import User, UserRole, UserStatus
from app.domain.interfaces import IUserRepository
from app.infrastructure.database.models import UserModel


class UserRepository(IUserRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    def _to_uuid(self, value) -> UUID:
        if isinstance(value, UUID):
            return value
        return UUID(str(value))

    async def create(self, user: User) -> User:
        user_model = UserModel(
            id=uuid4(),
            username=user.username,
            email=user.email,
            password_hash=user.password_hash,
            role=user.role,
            status=user.status,
        )
        self._session.add(user_model)
        await self._session.commit()
        await self._session.refresh(user_model)
        return User(
            id=self._to_uuid(user_model.id),
            username=user_model.username,
            email=user_model.email,
            password_hash=user_model.password_hash,
            role=user_model.role,
            status=user_model.status,
            created_at=user_model.created_at,
        )

    async def get_by_id(self, user_id: str) -> Optional[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.id == user_id)
        )
        user_model = result.scalar_one_or_none()
        if not user_model:
            return None
        return User(
            id=self._to_uuid(user_model.id),
            username=user_model.username,
            email=user_model.email,
            password_hash=user_model.password_hash,
            role=user_model.role,
            status=user_model.status,
            created_at=user_model.created_at,
        )

    async def get_by_username(self, username: str) -> Optional[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.username == username)
        )
        user_model = result.scalar_one_or_none()
        if not user_model:
            return None
        return User(
            id=self._to_uuid(user_model.id),
            username=user_model.username,
            email=user_model.email,
            password_hash=user_model.password_hash,
            role=user_model.role,
            status=user_model.status,
            created_at=user_model.created_at,
        )

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self._session.execute(
            select(UserModel).where(UserModel.email == email)
        )
        user_model = result.scalar_one_or_none()
        if not user_model:
            return None
        return User(
            id=self._to_uuid(user_model.id),
            username=user_model.username,
            email=user_model.email,
            password_hash=user_model.password_hash,
            role=user_model.role,
            status=user_model.status,
            created_at=user_model.created_at,
        )

    async def update_password(self, user_id: str, password_hash: str) -> None:
        await self._session.execute(
            update(UserModel)
            .where(UserModel.id == user_id)
            .values(password_hash=password_hash)
        )
        await self._session.commit()

    async def get_all(
        self, page: int, limit: int, status_filter: Optional[UserStatus] = None
    ) -> tuple[list[User], int]:
        query = select(UserModel)
        count_query = select(func.count(UserModel.id))

        if status_filter:
            query = query.where(UserModel.status == status_filter)
            count_query = count_query.where(UserModel.status == status_filter)

        query = query.order_by(UserModel.created_at.desc())

        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await self._session.execute(query)
        count_result = await self._session.execute(count_query)

        users = result.scalars().all()
        total = count_result.scalar() or 0

        return (
            [
                User(
                    id=self._to_uuid(user.id),
                    username=user.username,
                    email=user.email,
                    password_hash=user.password_hash,
                    role=user.role,
                    status=user.status,
                    created_at=user.created_at,
                )
                for user in users
            ],
            total,
        )

    async def update_status(self, user_id: str, status: UserStatus) -> None:
        await self._session.execute(
            update(UserModel).where(UserModel.id == user_id).values(status=status)
        )
        await self._session.commit()

    async def update_role(self, user_id: str, role: UserRole) -> None:
        await self._session.execute(
            update(UserModel).where(UserModel.id == user_id).values(role=role)
        )
        await self._session.commit()

    async def update_email(self, user_id: str, email: str) -> None:
        await self._session.execute(
            update(UserModel).where(UserModel.id == user_id).values(email=email)
        )
        await self._session.commit()

    async def delete(self, user_id: str) -> None:
        await self._session.execute(delete(UserModel).where(UserModel.id == user_id))
        await self._session.commit()
