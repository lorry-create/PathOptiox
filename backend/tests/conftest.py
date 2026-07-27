"""pytest 全局夹具

- TestClient：基于 FastAPI 的 ASGI 测试客户端（httpx）
- 登录验证已禁用，无需 token 即可访问所有接口
- 使用现有 pathoptix.db 数据库（只读测试不破坏数据，写测试自行清理）
"""
import os
import sys
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

# 确保 backend 目录在 sys.path 中（pytest 从 backend/ 启动时自动包含，
# 但显式插入可避免 conftest 导入路径歧义）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """会话级 TestClient：整个测试会话只创建一次 app 实例。

    main 模块导入时会执行 init_db()（建表 + seed），确保数据库就绪。
    """
    from main import app

    with TestClient(app) as c:
        yield c
