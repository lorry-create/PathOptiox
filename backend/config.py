"""应用配置模块

使用 pydantic-settings 管理环境变量配置，支持从 .env 文件读取。

S1-T07 修复：SECRET_KEY 改为强制从 .env 读取，源码中不再保留硬编码默认值。
S1-T05 修复：DASHSCOPE_API_KEY 集中从此处读取，供 LangGraph 工作流与聊天客服使用。
"""
import json
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用配置类"""

    APP_NAME: str = "PathOptix API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    PORT: int = 8010
    API_V1_PREFIX: str = "/api"

    DATABASE_URL: str = "sqlite:///./pathoptix.db"

    # S3-T02: Redis 缓存配置
    REDIS_URL: str = "redis://localhost:6379/0"

    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
    ]

    # S1-T07：SECRET_KEY 不再硬编码默认值，必须从 .env 读取
    # 缺失时启动将抛 ValidationError，强制运维显式配置
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # S1-T05：DashScope（阿里云百炼）API Key
    # 申请地址：https://dashscope.console.aliyun.com/apiKey
    # 配置后 LangGraph 工作流调用 Qwen 生成可解释性报告，未配置时降级到硬编码
    DASHSCOPE_API_KEY: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """支持逗号分隔字符串或 JSON 数组字符串解析 CORS_ORIGINS 环境变量"""
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                return json.loads(v)
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """校验 SECRET_KEY 不为空且非默认占位符"""
        if not v or not v.strip():
            raise ValueError(
                "SECRET_KEY 不能为空，请在 backend/.env 中配置随机生成的 SECRET_KEY"
            )
        if v in (
            "pathoptix_dev_secret_key_change_in_production_2026",
            "change_me",
            "secret",
        ):
            raise ValueError(
                "SECRET_KEY 不得使用默认占位符，请运行 "
                "python -c \"import secrets; print(secrets.token_urlsafe(32))\" "
                "生成新密钥并写入 backend/.env"
            )
        return v


settings = Settings()