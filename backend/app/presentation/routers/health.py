from fastapi import APIRouter, Depends
from sqlalchemy import text

from app.infrastructure.database import get_db
from app.infrastructure.database.redis import get_redis


router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check(db=Depends(get_db)):
    try:
        await db.execute(text("SELECT 1"))
    except Exception as e:
        return {
            "healthy": False,
            "error": f"Database unavailable: {str(e)}",
        }

    try:
        redis = get_redis()
        await redis.ping()
    except Exception as e:
        return {
            "healthy": False,
            "error": f"Redis unavailable: {str(e)}",
        }

    return {"healthy": True}
