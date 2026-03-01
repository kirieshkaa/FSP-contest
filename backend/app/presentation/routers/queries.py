from typing import Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    UploadFile,
    File,
    Form,
    Query as QueryParam,
)
from fastapi.responses import JSONResponse

from app.application import QueryService
from app.presentation.deps import get_query_service, CurrentUser, get_current_user_id
from app.domain.entities import Query


router = APIRouter(prefix="/queries", tags=["queries"])


@router.post("")
async def create_query(
    file: UploadFile = File(...),
    query_title: Optional[str] = Form(None),
    months: int = Form(36),
    purchase: int = Form(0),
    target_date: Optional[str] = Form(None),
    params_source: str = Form("custom"),
    maintain_replacement: bool = Form(False),
    growth_target: Optional[float] = Form(None),
    purchase_curve: Optional[str] = Form(None),
    age_first_insem: Optional[int] = Form(None),
    prob_insem: Optional[float] = Form(None),
    gestation: Optional[int] = Form(None),
    dry_period: Optional[int] = Form(None),
    culling_rate: Optional[float] = Form(None),
    current_user: CurrentUser = Depends(get_current_user_id),
    query_service: QueryService = Depends(get_query_service),
):
    try:
        if not file.filename or not file.filename.endswith(".csv"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Поддерживаются только CSV файлы",
            )

        file_content = await file.read()

        import pandas as pd
        import io

        try:
            df = pd.read_csv(
                io.BytesIO(file_content),
                encoding="utf-8-sig",
                sep=None,
                engine="python",
            )
        except Exception:
            for sep in [",", ";", "\t"]:
                try:
                    df = pd.read_csv(
                        io.BytesIO(file_content), encoding="utf-8-sig", sep=sep
                    )
                    if len(df.columns) > 1:
                        break
                except Exception:
                    continue
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Не удалось прочитать CSV файл",
                )

        df.columns = df.columns.str.strip()

        REQUIRED_COLUMNS = [
            "Номер животного",
            "Дата рождения",
            "Дни в доении",
            "Статус коровы",
        ]
        missing_columns = set(REQUIRED_COLUMNS) - set(df.columns)
        if missing_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Отсутствуют обязательные колонки: {', '.join(missing_columns)}",
            )
        query = await query_service.create_query(
            user_id=current_user.user_id,
            file_content=file_content,
            filename=file.filename or "data.csv",
            query_title=query_title,
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
        return {
            "query_id": str(query.id),
            "query_title": query.query_title,
            "created_at": query.created_at.isoformat(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get("")
async def get_queries(
    page: int = QueryParam(1, ge=1),
    limit: int = QueryParam(10, ge=1, le=100),
    current_user: CurrentUser = Depends(get_current_user_id),
    query_service: QueryService = Depends(get_query_service),
):
    result = await query_service.get_user_queries(current_user.user_id, page, limit)
    return {
        "items": [
            {
                "query_id": str(q.id),
                "query_title": q.query_title,
                "created_at": q.created_at.isoformat(),
            }
            for q in result.items
        ],
        "total": result.total,
        "page": result.page,
        "limit": result.limit,
    }


@router.get("/{query_id}")
async def get_query(
    query_id: str,
    current_user: CurrentUser = Depends(get_current_user_id),
    query_service: QueryService = Depends(get_query_service),
):
    result = await query_service.get_query_with_response(query_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Query not found",
        )

    query, response = result

    if str(query.user_id) != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this query",
        )

    return {
        "query": {
            "query_id": str(query.id),
            "query_title": query.query_title,
            "created_at": query.created_at.isoformat(),
        },
        "response": {
            "response_id": str(response.id),
            "response_json": response.response_json,
            "created_at": response.created_at.isoformat(),
        },
    }


@router.delete("/{query_id}")
async def delete_query(
    query_id: str,
    current_user: CurrentUser = Depends(get_current_user_id),
    query_service: QueryService = Depends(get_query_service),
):
    try:
        await query_service.delete_query(query_id, current_user.user_id)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
