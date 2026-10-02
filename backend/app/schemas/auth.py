from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator


def validate_username(value: str) -> str:
    username = value.strip()
    if not 3 <= len(username) <= 24:
        raise ValueError("用户名长度必须为 3 到 24 个字符")
    if not all(character.isalnum() or character == "_" for character in username):
        raise ValueError("用户名只能包含文字、数字和下划线")
    return username


class AuthRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_is_valid(cls, value: str) -> str:
        return validate_username(value)

    @field_validator("password")
    @classmethod
    def password_is_valid(cls, value: str) -> str:
        if not 8 <= len(value) <= 128:
            raise ValueError("密码长度必须为 8 到 128 个字符")
        return value


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic
