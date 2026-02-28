from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.entities import QueryResponse
from app.domain.interfaces import IQueryResponseRepository
from app.infrastructure.database.models import QueryResponseModel


class QueryResponseRepository(IQueryResponseRepository):
    def __init__(self, session: AsyncSession):
        self._session = session

    async def create(self, response: QueryResponse) -> QueryResponse:
        response_model = QueryResponseModel(
            id=response.id,
            query_id=response.query_id,
            response_json=response.response_json,
        )
        self._session.add(response_model)
        await self._session.commit()
        await self._session.refresh(response_model)
        return QueryResponse(
            id=response_model.id,
            query_id=response_model.query_id,
            response_json=response_model.response_json,
            created_at=response_model.created_at,
        )

    async def get_by_query_id(self, query_id: str) -> Optional[QueryResponse]:
        result = await self._session.execute(
            select(QueryResponseModel).where(QueryResponseModel.query_id == query_id)
        )
        response_model = result.scalar_one_or_none()
        if not response_model:
            return None
        return QueryResponse(
            id=response_model.id,
            query_id=response_model.query_id,
            response_json=response_model.response_json,
            created_at=response_model.created_at,
        )
