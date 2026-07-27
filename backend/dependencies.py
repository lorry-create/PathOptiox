"""全局依赖模块

集中存放可被路由层注入的依赖：数据库会话、JWT 鉴权等。
"""
import logging
from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from database import get_db, get_db_session
from models.user import User
from services.auth_service import decode_access_token

logger = logging.getLogger(__name__)


# OAuth2 密码流：tokenUrl 指向登录接口（Swagger UI "Authorize" 按钮据此跳转）
# 实际完整路径为 /api/auth/login（main.py 挂载 /api 前缀）
# 【临时禁用登录验证】auto_error=False 使 OAuth2PasswordBearer 在缺少 token 时不抛 401
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


# 401 统一异常：附带 WWW-Authenticate 头，符合 RFC 6750
credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="无法验证凭据，请重新登录",
    headers={"WWW-Authenticate": "Bearer"},
)


# 【临时禁用登录验证】默认用户名：当请求未携带有效 token 时，以此用户身份访问系统
# 该用户由 init_db.py 在启动时自动创建（lorry / 123456）
DISABLE_AUTH_DEFAULT_USERNAME = "lorry"


def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> User:
    """解析 Authorization 头中的 JWT，返回当前登录用户

    【临时禁用登录验证】
    - 如果 token 有效，按原逻辑解析并返回对应用户
    - 如果 token 缺失或无效，直接返回默认用户（lorry），不抛 401 异常
    - 这样既绕过登录验证，又保证所有依赖 current_user 的接口能正常工作

    原流程：
    1. OAuth2PasswordBearer 自动从 Authorization: Bearer <token> 提取 token
    2. decode_access_token 解码并校验签名与 exp
    3. 从载荷 sub 字段取用户名，查库确认用户存在
    4. 返回 User ORM 实例供路由层使用

    Raises:
        HTTPException 401: 仅在默认用户也不存在时抛出（极端情况）
    """
    # 尝试解析 token（如果有）
    username: Optional[str] = None
    if token:
        try:
            payload = decode_access_token(token)
            username = payload.get("sub")
        except JWTError:
            # token 无效，不抛异常，降级为默认用户
            logger.warning("[Auth] token 无效，降级使用默认用户（登录验证已禁用）")
            username = None

    # 如果 token 有效且解析出用户名，走原逻辑
    if username:
        with get_db_session() as db:
            user = (
                db.query(User)
                .filter(User.username == username, User.is_deleted.is_(False))
                .first()
            )
        if user is not None:
            return user
        # token 中的用户不存在，降级为默认用户
        logger.warning(f"[Auth] token 用户 '{username}' 不存在，降级使用默认用户")

    # 【临时禁用登录验证】无 token 或 token 无效时，返回默认用户
    with get_db_session() as db:
        default_user = (
            db.query(User)
            .filter(User.username == DISABLE_AUTH_DEFAULT_USERNAME, User.is_deleted.is_(False))
            .first()
        )

    if default_user is None:
        # 极端情况：默认用户不存在（init_db 未执行）
        logger.error(f"[Auth] 默认用户 '{DISABLE_AUTH_DEFAULT_USERNAME}' 不存在，请检查数据库初始化")
        raise credentials_exception

    return default_user


__all__ = ["get_db", "get_current_user", "oauth2_scheme"]
