"""全局异常处理器

统一所有异常的返回格式为 {"detail": "错误描述"}，对齐前端错误解析逻辑。
同时通过 logging 记录异常详情，500 异常记录完整堆栈用于运维排查。
"""
import logging

from fastapi import FastAPI, Request, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

# 使用 pathoptix logger（由 logging_config.setup_logging 配置）
logger = logging.getLogger("pathoptix")


def register_exception_handlers(app: FastAPI) -> None:
    """注册全局异常处理器到 FastAPI 应用"""

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """参数校验失败 (422)：提取首个错误信息统一返回"""
        # 记录完整的校验错误列表，便于排查前端传参问题
        logger.warning(
            "参数校验失败 %s %s | errors=%s",
            request.method,
            request.url.path,
            exc.errors(),
        )
        errors = exc.errors()
        if errors:
            first_error = errors[0]
            # 过滤掉 location 中的 body/cookie 等内部标识，仅保留字段路径
            loc_clean = " -> ".join(
                str(item) for item in first_error.get("loc", []) if item not in ("body",)
            )
            msg = first_error.get("msg", "参数校验失败")
            detail = f"{loc_clean} {msg}".strip() if loc_clean else msg
        else:
            detail = "参数校验失败"
        return JSONResponse(
            status_code=422,
            content={"detail": detail},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(
        request: Request, exc: HTTPException
    ) -> JSONResponse:
        """HTTPException：原样保留 status_code 与 detail 字段"""
        # 4xx 业务异常用 warning 级别记录（不含堆栈，避免日志噪声）
        logger.warning(
            "HTTPException %s %s | status=%s detail=%s",
            request.method,
            request.url.path,
            exc.status_code,
            exc.detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
            headers=getattr(exc, "headers", None),
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """通用异常兜底 (500)：返回通用错误提示，但记录完整堆栈用于排查

        logger.exception 会自动附加当前异常的 traceback，
        实现"前端友好提示 + 后端完整堆栈"的双轨记录。
        """
        logger.exception(
            "未处理异常 %s %s | %s: %s",
            request.method,
            request.url.path,
            type(exc).__name__,
            exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "服务器内部错误，请稍后重试"},
        )