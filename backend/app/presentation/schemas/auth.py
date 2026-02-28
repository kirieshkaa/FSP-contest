from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)


class RegisterResponse(BaseModel):
    access_token: str


class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: str

    @property
    def has_credentials(self) -> bool:
        return self.username is not None or self.email is not None


class LoginResponse(BaseModel):
    access_token: str


class RefreshResponse(BaseModel):
    access_token: str


class LogoutResponse(BaseModel):
    ok: bool = True


class TokenResponse(BaseModel):
    access_token: str


class ErrorResponse(BaseModel):
    ok: bool = False
    message: str
