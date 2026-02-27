from app.presentation.routers.auth import router as auth_router
from app.presentation.routers.password_reset import router as password_reset_router
from app.presentation.routers.health import router as health_router

__all__ = ["auth_router", "password_reset_router", "health_router"]
