import os
import shutil
from pathlib import Path
from uuid import uuid4
from datetime import datetime, timezone
from typing import Optional

from app.config import get_config
from app.domain.entities import Query, QueryResponse
from app.domain.interfaces import IQueryRepository, IQueryResponseRepository


AI_STUB_RESPONSE = [
    {
        "month": "2026-02",
        "avg_dim": 165.3,
        "cows_count": 770,
        "total_adults": 1070,
        "milk_total": 498367,
        "first_calvings": 11,
        "extra_purchase": 20,
        "total_purchased": 20,
    },
    {
        "month": "2026-03",
        "avg_dim": 174.6,
        "cows_count": 765,
        "total_adults": 1072,
        "milk_total": 478154,
        "first_calvings": 14,
        "extra_purchase": 21,
        "total_purchased": 21,
    },
    {
        "month": "2026-04",
        "avg_dim": 179.6,
        "cows_count": 722,
        "total_adults": 1081,
        "milk_total": 442492,
        "first_calvings": 15,
        "extra_purchase": 22,
        "total_purchased": 22,
    },
    {
        "month": "2026-05",
        "avg_dim": 181.8,
        "cows_count": 700,
        "total_adults": 1099,
        "milk_total": 425342,
        "first_calvings": 35,
        "extra_purchase": 20,
        "total_purchased": 20,
    },
    {
        "month": "2026-06",
        "avg_dim": 173.8,
        "cows_count": 694,
        "total_adults": 1110,
        "milk_total": 435131,
        "first_calvings": 27,
        "extra_purchase": 19,
        "total_purchased": 19,
    },
    {
        "month": "2026-07",
        "avg_dim": 162.5,
        "cows_count": 722,
        "total_adults": 1148,
        "milk_total": 472236,
        "first_calvings": 45,
        "extra_purchase": 14,
        "total_purchased": 14,
    },
    {
        "month": "2026-08",
        "avg_dim": 156.5,
        "cows_count": 782,
        "total_adults": 1164,
        "milk_total": 522729,
        "first_calvings": 52,
        "extra_purchase": 7,
        "total_purchased": 7,
    },
    {
        "month": "2026-09",
        "avg_dim": 164.1,
        "cows_count": 867,
        "total_adults": 1173,
        "milk_total": 563781,
        "first_calvings": 54,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2026-10",
        "avg_dim": 174.6,
        "cows_count": 937,
        "total_adults": 1168,
        "milk_total": 585602,
        "first_calvings": 18,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2026-11",
        "avg_dim": 188.3,
        "cows_count": 869,
        "total_adults": 1158,
        "milk_total": 514444,
        "first_calvings": 17,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2026-12",
        "avg_dim": 203.6,
        "cows_count": 812,
        "total_adults": 1161,
        "milk_total": 460194,
        "first_calvings": 23,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2027-01",
        "avg_dim": 199.1,
        "cows_count": 819,
        "total_adults": 1159,
        "milk_total": 463632,
        "first_calvings": 22,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2027-02",
        "avg_dim": 202.8,
        "cows_count": 831,
        "total_adults": 1159,
        "milk_total": 471608,
        "first_calvings": 11,
        "extra_purchase": 22,
        "total_purchased": 22,
    },
    {
        "month": "2027-03",
        "avg_dim": 203.2,
        "cows_count": 824,
        "total_adults": 1174,
        "milk_total": 467298,
        "first_calvings": 17,
        "extra_purchase": 22,
        "total_purchased": 22,
    },
    {
        "month": "2027-04",
        "avg_dim": 211.7,
        "cows_count": 812,
        "total_adults": 1186,
        "milk_total": 454261,
        "first_calvings": 33,
        "extra_purchase": 21,
        "total_purchased": 21,
    },
    {
        "month": "2027-05",
        "avg_dim": 209.7,
        "cows_count": 819,
        "total_adults": 1187,
        "milk_total": 459706,
        "first_calvings": 19,
        "extra_purchase": 21,
        "total_purchased": 21,
    },
    {
        "month": "2027-06",
        "avg_dim": 215.7,
        "cows_count": 809,
        "total_adults": 1204,
        "milk_total": 449688,
        "first_calvings": 21,
        "extra_purchase": 21,
        "total_purchased": 21,
    },
    {
        "month": "2027-07",
        "avg_dim": 212.4,
        "cows_count": 784,
        "total_adults": 1205,
        "milk_total": 438153,
        "first_calvings": 39,
        "extra_purchase": 18,
        "total_purchased": 18,
    },
    {
        "month": "2027-08",
        "avg_dim": 208.9,
        "cows_count": 791,
        "total_adults": 1210,
        "milk_total": 444525,
        "first_calvings": 33,
        "extra_purchase": 15,
        "total_purchased": 15,
    },
    {
        "month": "2027-09",
        "avg_dim": 195.5,
        "cows_count": 818,
        "total_adults": 1224,
        "milk_total": 470258,
        "first_calvings": 37,
        "extra_purchase": 10,
        "total_purchased": 10,
    },
    {
        "month": "2027-10",
        "avg_dim": 194.2,
        "cows_count": 856,
        "total_adults": 1230,
        "milk_total": 494769,
        "first_calvings": 36,
        "extra_purchase": 1,
        "total_purchased": 1,
    },
    {
        "month": "2027-11",
        "avg_dim": 189.6,
        "cows_count": 892,
        "total_adults": 1238,
        "milk_total": 525321,
        "first_calvings": 52,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2027-12",
        "avg_dim": 184.8,
        "cows_count": 905,
        "total_adults": 1244,
        "milk_total": 543443,
        "first_calvings": 35,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2028-01",
        "avg_dim": 184.1,
        "cows_count": 906,
        "total_adults": 1231,
        "milk_total": 545594,
        "first_calvings": 27,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2028-02",
        "avg_dim": 183.9,
        "cows_count": 924,
        "total_adults": 1226,
        "milk_total": 556896,
        "first_calvings": 22,
        "extra_purchase": 24,
        "total_purchased": 24,
    },
    {
        "month": "2028-03",
        "avg_dim": 187.3,
        "cows_count": 925,
        "total_adults": 1239,
        "milk_total": 549828,
        "first_calvings": 21,
        "extra_purchase": 24,
        "total_purchased": 24,
    },
    {
        "month": "2028-04",
        "avg_dim": 194.5,
        "cows_count": 927,
        "total_adults": 1264,
        "milk_total": 535068,
        "first_calvings": 10,
        "extra_purchase": 25,
        "total_purchased": 25,
    },
    {
        "month": "2028-05",
        "avg_dim": 199.8,
        "cows_count": 886,
        "total_adults": 1259,
        "milk_total": 500111,
        "first_calvings": 18,
        "extra_purchase": 26,
        "total_purchased": 26,
    },
    {
        "month": "2028-06",
        "avg_dim": 206.7,
        "cows_count": 867,
        "total_adults": 1285,
        "milk_total": 488952,
        "first_calvings": 17,
        "extra_purchase": 28,
        "total_purchased": 28,
    },
    {
        "month": "2028-07",
        "avg_dim": 210.1,
        "cows_count": 861,
        "total_adults": 1295,
        "milk_total": 482912,
        "first_calvings": 39,
        "extra_purchase": 26,
        "total_purchased": 26,
    },
    {
        "month": "2028-08",
        "avg_dim": 208.8,
        "cows_count": 888,
        "total_adults": 1304,
        "milk_total": 499112,
        "first_calvings": 45,
        "extra_purchase": 22,
        "total_purchased": 22,
    },
    {
        "month": "2028-09",
        "avg_dim": 208.1,
        "cows_count": 908,
        "total_adults": 1326,
        "milk_total": 510981,
        "first_calvings": 44,
        "extra_purchase": 16,
        "total_purchased": 16,
    },
    {
        "month": "2028-10",
        "avg_dim": 209.1,
        "cows_count": 899,
        "total_adults": 1316,
        "milk_total": 505067,
        "first_calvings": 41,
        "extra_purchase": 7,
        "total_purchased": 7,
    },
    {
        "month": "2028-11",
        "avg_dim": 205.9,
        "cows_count": 901,
        "total_adults": 1311,
        "milk_total": 508809,
        "first_calvings": 38,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
    {
        "month": "2028-12",
        "avg_dim": 200.1,
        "cows_count": 917,
        "total_adults": 1305,
        "milk_total": 522645,
        "first_calvings": 43,
        "extra_purchase": 0,
        "total_purchased": 0,
    },
]


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

        ai_response = await self._process_with_ai(str(file_path))

        response = QueryResponse(
            id=uuid4(),
            query_id=query_id,
            response_json=ai_response,
            created_at=datetime.now(timezone.utc),
        )
        await self._query_response_repo.create(response)

        return created_query

    async def _process_with_ai(self, file_path: str) -> list[dict]:
        return AI_STUB_RESPONSE

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
