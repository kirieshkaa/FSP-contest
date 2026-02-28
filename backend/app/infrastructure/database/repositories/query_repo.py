from typing import Optional
from uuid import uuid4

from sqlalchemy import select, delete, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import Query, PaginatedQueries
from app.domain.interfaces import IQueryRepository
from app.infrastructure.database.models import QueryModel


class QueryRepository(IQueryRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, query: Query) -> Query:
        query_model = QueryModel(
            id=query.id,
            user_id=query.user_id,
            query_title=query.query_title,
            file_path=query.file_path,
        )
        self._session.add(query_model)
        await self._session.commit()
        await self._session.refresh(query_model)
        return Query(
            id=query_model.id,
            user_id=query_model.user_id,
            query_title=query_model.query_title,
            file_path=query_model.file_path,
            created_at=query_model.created_at,
        )

    async def get_by_id(self, query_id: str) -> Optional[Query]:
        result = await self._session.execute(
            select(QueryModel).where(QueryModel.id == query_id)
        )
        query_model = result.scalar_one_or_none()
        if not query_model:
            return None
        return Query(
            id=query_model.id,
            user_id=query_model.user_id,
            query_title=query_model.query_title,
            file_path=query_model.file_path,
            created_at=query_model.created_at,
        )

    async def get_by_user_id(
        self, user_id: str, page: int, limit: int
    ) -> PaginatedQueries:
        offset = (page - 1) * limit

        count_result = await self._session.execute(
            select(func.count())
            .select_from(QueryModel)
            .where(QueryModel.user_id == user_id)
        )
        total = count_result.scalar() or 0

        result = await self._session.execute(
            select(QueryModel)
            .where(QueryModel.user_id == user_id)
            .order_by(QueryModel.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        query_models = result.scalars().all()

        items = [
            Query(
                id=qm.id,
                user_id=qm.user_id,
                query_title=qm.query_title,
                file_path=qm.file_path,
                created_at=qm.created_at,
            )
            for qm in query_models
        ]

        return PaginatedQueries(items=items, total=total, page=page, limit=limit)

    async def delete(self, query_id: str) -> None:
        await self._session.execute(delete(QueryModel).where(QueryModel.id == query_id))
        await self._session.commit()
