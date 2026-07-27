"""认证模块路由

POST /auth/login 接收 application/x-www-form-urlencoded 格式的用户名密码（公开接口）。
GET  /auth/me  需携带有效 JWT，返回当前登录用户信息。
"""
from fastapi import APIRouter, Depends, Form

from dependencies import get_current_user
from models.user import User
from services.auth_service import auth_service


router = APIRouter()


@router.post("/login", summary="用户登录")
def login(
    username: str = Form(..., description="用户名"),
    password: str = Form(..., description="密码"),
):
    """接收表单格式的用户名密码，校验通过后签发 JWT access_token"""
    return auth_service.login(username=username, password=password)


@router.get("/me", summary="当前用户信息")
def me(current_user: User = Depends(get_current_user)):
    """返回当前登录用户基础信息（需携带有效 JWT）"""
    return auth_service.me(current_user)
