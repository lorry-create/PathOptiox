"""PathOptix 物流路径优化平台后端 - 应用入口

职责：
1. 初始化日志系统（dictConfig，console + 滚动文件）
2. 创建 FastAPI 实例（关闭 redirect_slashes）
3. 注册 CORSMiddleware（放行前端 5173 端口，支持携带凭证）
4. 注册全局异常处理器（统一返回 {"detail": "..."} 格式 + 500 堆栈日志）
5. 挂载 /api 总路由
6. 启动时初始化数据库（建表 + 空库插入示例数据）
"""
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from api.v1 import api_router
from exceptions import register_exception_handlers
from logging_config import setup_logging
from utils.init_db import init_db


# ===== 启动时初始化日志系统 =====
# 必须在 init_db 之前调用，确保建表与 seed 过程中的异常也能被记录
setup_logging()


# ===== 启动时初始化数据库 =====
# 建表 + 空库时插入示例数据，幂等安全
init_db()


# ===== 启动时初始化 RAG 向量索引 =====
# S3-T03: 从数据库加载知识库并构建 TF-IDF 向量索引
def _init_rag_index() -> None:
    try:
        from services.rag_service import rag_service
        rag_service.initialize()
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"RAG 向量索引初始化失败: {e}（可通过 /api/knowledge-base/search 触发延迟初始化）")

_init_rag_index()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="PathOptix 物流路径优化平台后端 API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    # 强制关闭尾部斜杠重定向：所有接口路径严格不带尾部斜杠
    redirect_slashes=False,
)

# ===== 中间件：CORS =====
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,  # 支持携带凭证
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ===== 全局异常处理器 =====
register_exception_handlers(app)

# ===== 路由挂载：统一前缀 /api =====
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["root"], summary="健康检查")
def root():
    """根路径健康检查接口"""
    return {"message": "PathOptix API is running", "version": settings.APP_VERSION}


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", settings.PORT))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        # S1-T09：默认情况下 uvicorn 的 reloader 会忽略以 "." 开头的隐藏文件，
        # 导致改动 .env 后不会自动重启、settings 仍是旧值。显式纳入 .env 的监控，
        # 这样修改配置无需手动重启后端。
        reload_includes=["*.env", ".env"],
    )
