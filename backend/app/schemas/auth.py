import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ClientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    client: Literal["web", "android"] = "web"


class LoginInput(ClientInput):
    email: EmailStr = Field(max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class RegisterInput(LoginInput):
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("full_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Enter at least two characters for your name.")
        return value


class UserOutput(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    full_name: str
    email: str
    role: str


class ProfileOutput(BaseModel):
    session_type: Literal["user", "guest"]
    expires_at: datetime
    user: UserOutput | None
    planned_download_limit: int
    download_limit: int
    downloads_used: int
    downloads_remaining: int


class AuthOutput(ProfileOutput):
    access_token: str | None = None
    token_type: Literal["bearer"] | None = None
