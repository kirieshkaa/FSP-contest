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
    current_user: CurrentUser = Depends(get_current_user_id),
    query_service: QueryService = Depends(get_query_service),
):
    try:
        file_content = await file.read()
        query = await query_service.create_query(
            user_id=current_user.user_id,
            file_content=file_content,
            filename=file.filename,
            query_title=query_title,
        )
        return {
            "query_id": str(query.id),
            "query_title": query.query_title,
            "file_path": query.file_path,
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
                "file_path": q.file_path,
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
            "file_path": query.file_path,
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
