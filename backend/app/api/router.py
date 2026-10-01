from fastapi import APIRouter

from app.api.routes import auth, rooms


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(rooms.router, prefix="/rooms", tags=["reading rooms"])
