from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
from app.core.auth import authenticate_user, login_user, logout_user
from app.db.database import get_db
from app.models.user import User as UserModel
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    username: str
    password: str

@router.post("/logout")
async def logout(request: Request):
    logout_user(request)
    return {"message": "Logout successful"}

@router.post("/login")
async def login(request: Request, login_request: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, login_request.username, login_request.password)
    if not user:
        return {
            "status": 401,
            "message": "账号或密码错误"
        }
    login_user(request, user)
    return {
        "status": 200,
        "message": "登录成功"
    }