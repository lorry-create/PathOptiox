"""认证模块业务服务层

真实 JWT 签发 + bcrypt 密码哈希校验实现。
- bcrypt 库负责密码哈希与校验（自带盐值，工业级强度）
- python-jose 负责 JWT 签发与解析
- Access Token 携带 sub（用户名）与 exp（过期时间）声明

注：原计划使用 passlib.context.CryptContext，但 passlib 1.7.4 与 bcrypt>=4.1
存在兼容性问题（bcrypt.__about__ 属性被移除 + 72 字节检查变严格），故直接使用
bcrypt 库，效果等价且依赖更少。
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import HTTPException
from jose import jwt

from config import settings
from database import get_db_session
from models.user import User


# 默认管理员账号（首次启动初始化时插入；password 为明文，seed 时哈希后写入）
DEFAULT_ADMIN = {
    "username": "lorry",
    "password": "123456",
    "email": "lorry@example.com",
    "full_name": "Lorry Driver",
    "is_admin": True,
}


# ===== 密码工具函数 =====
def hash_password(plain_password: str) -> str:
    """对明文密码进行 bcrypt 哈希

    bcrypt 自带随机盐值，相同密码每次哈希结果不同。
    返回值为字符串形式（如 '$2b$12$...'），可直接存入数据库。
    """
    # bcrypt 要求输入为 bytes；密码超过 72 字节会被截断（bcrypt 算法限制）
    pwd_bytes = plain_password.encode("utf-8")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """校验明文密码与哈希值是否匹配

    使用常量时间比较（bcrypt.checkpw 内部实现），防止时序攻击。
    """
    pwd_bytes = plain_password.encode("utf-8")
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


# ===== JWT 工具函数 =====
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """签发 JWT Access Token

    Args:
        data: 待编码的载荷，必须包含 "sub"（用户标识）
        expires_delta: 自定义过期时长；未指定时使用全局默认配置

    Returns:
        编码后的 JWT 字符串
    """
    to_encode = data.copy()
    # 强制注入 exp（过期时间），UTC 时间戳
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """解析 JWT Token，返回载荷字典

    Raises:
        jose.JWTError: Token 无效、签名错误或已过期时抛出
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


class AuthService:
    """认证服务（真实 JWT + bcrypt）"""

    def login(self, username: str, password: str) -> dict:
        """登录验证：查库 → 校验密码 → 签发 JWT

        Args:
            username: 用户名
            password: 明文密码

        Returns:
            {"access_token": "...", "token_type": "bearer", "username": "..."}

        Raises:
            HTTPException 400: 用户名或密码为空
            HTTPException 401: 用户不存在或密码错误
        """
        if not username or not password:
            raise HTTPException(status_code=400, detail="用户名和密码不能为空")

        with get_db_session() as db:
            user = (
                db.query(User)
                .filter(User.username == username, User.is_deleted.is_(False))
                .first()
            )

        # 用户不存在或密码校验失败：统一返回 401（避免泄露用户是否存在）
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="用户名或密码错误")

        # 签发 JWT，sub 为用户名（get_current_user 据此查库）
        access_token = create_access_token(data={"sub": user.username})
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "username": user.full_name or user.username,
        }

    def me(self, current_user: User) -> dict:
        """返回当前登录用户的基础信息

        字段对齐前端 auth.ts 的 UserInfo：{id, username, email?, role?}
        由 get_current_user 依赖注入解析 token 后传入 User 对象。

        Args:
            current_user: 已通过 JWT 校验的 User ORM 实例
        """
        return {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email or "",
            "role": "admin" if current_user.is_admin else "user",
        }


auth_service = AuthService()