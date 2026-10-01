from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AuthRequest, TokenResponse, UserPublic, normalize_username


router = APIRouter()


def token_response(user: User) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user.id),
        user=UserPublic.model_validate(user),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: AuthRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    normalized_username = normalize_username(payload.username)
    existing_user = db.scalar(
        select(User).where(User.username_normalized == normalized_username)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已被使用",
        )

    user = User(
        username=payload.username,
        username_normalized=normalized_username,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="用户名已被使用",
        ) from None

    db.refresh(user)
    return token_response(user)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: AuthRequest,
    db: Annotated[Session, Depends(get_db)],
) -> TokenResponse:
    normalized_username = normalize_username(payload.username)
    user = db.scalar(
        select(User).where(User.username_normalized == normalized_username)
    )
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
        )
    return token_response(user)


@router.get("/me", response_model=UserPublic)
def current_user(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
