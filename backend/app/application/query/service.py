import os
import shutil
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional

from app.config import get_config
from app.domain.entities import Query, QueryResponse
from app.domain.interfaces import IQueryRepository, IQueryResponseRepository
from app.ml.service import ml_prediction_service


class QueryService:
    def __init__(
        self,
        query_repo: IQueryRepository,
        query_response_repo: IQueryResponseRepository,
    ):
        self._query_repo = query_repo
        self._query_response_repo = query_response_repo
        self._ensure_upload_dir()

    def _ensure_upload_dir(self) -> None:
        config = get_config()
        upload_dir = Path(config.upload.directory)
        if not upload_dir.exists():
            upload_dir.mkdir(parents=True, exist_ok=True)

    def _validate_file(self, filename: str, content_length: int) -> None:
        config = get_config()

        if content_length > config.upload.max_file_size_mb * 1024 * 1024:
            raise Exception(
                f"File too large. Maximum size: {config.upload.max_file_size_mb}MB"
            )

        ext = Path(filename).suffix.lower()
        if ext not in config.upload.allowed_extensions:
            raise Exception(
                f"Invalid file type. Allowed: {config.upload.allowed_extensions}"
            )

    async def create_query(
        self,
        user_id: str,
        file_content: bytes,
        filename: str,
        query_title: Optional[str] = None,
        months: int = 36,
        purchase: int = 0,
        target_date: Optional[str] = None,
        params_source: str = "custom",
        maintain_replacement: bool = False,
        growth_target: Optional[float] = None,
        purchase_curve: Optional[str] = None,
        age_first_insem: Optional[int] = None,
        prob_insem: Optional[float] = None,
        gestation: Optional[int] = None,
        dry_period: Optional[int] = None,
        culling_rate: Optional[float] = None,
    ) -> Query:
        self._validate_file(filename, len(file_content))

        query_id = uuid4()
        config = get_config()
        safe_filename = f"{query_id}_{filename}"
        file_path = Path(config.upload.directory) / safe_filename

        with open(file_path, "wb") as f:
            f.write(file_content)

        query = Query(
            id=query_id,
            user_id=user_id,
            query_title=query_title,
            file_path=str(file_path),
            created_at=datetime.now(timezone.utc),
        )
        created_query = await self._query_repo.create(query)

        ai_response = ml_prediction_service.predict(
            file_content=file_content,
            months=months,
            purchase=purchase,
            target_date=target_date,
            params_source=params_source,
            maintain_replacement=maintain_replacement,
            growth_target=growth_target,
            purchase_curve=purchase_curve,
            age_first_insem=age_first_insem,
            prob_insem=prob_insem,
            gestation=gestation,
            dry_period=dry_period,
            culling_rate=culling_rate,
        )

        response = QueryResponse(
            id=uuid4(),
            query_id=query_id,
            response_json=ai_response,
            created_at=datetime.now(timezone.utc),
        )
        await self._query_response_repo.create(response)

        return created_query

    async def get_query(self, query_id: str) -> Optional[Query]:
        return await self._query_repo.get_by_id(query_id)

    async def get_query_with_response(
        self, query_id: str
    ) -> Optional[tuple[Query, QueryResponse]]:
        query = await self._query_repo.get_by_id(query_id)
        if not query:
            return None

        response = await self._query_response_repo.get_by_query_id(query_id)
        return query, response

    async def get_user_queries(self, user_id: str, page: int = 1, limit: int = 10):
        return await self._query_repo.get_by_user_id(user_id, page, limit)

    async def delete_query(self, query_id: str, user_id: str) -> None:
        query = await self._query_repo.get_by_id(query_id)
        if not query:
            raise Exception("Query not found")

        if str(query.user_id) != user_id:
            raise Exception("Not authorized to delete this query")

        file_path = Path(query.file_path)
        if file_path.exists():
            file_path.unlink()

        await self._query_repo.delete(query_id)
