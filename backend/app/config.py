"""app.config — 应用配置统一入口

S1-T07/S1-T05 修复：将原 app/config.py 的双份配置统一为
re-export 自 backend/config.py 的 settings，避免配置漂移
（旧版本每次启动生成随机 SECRET_KEY 导致 JWT 失效）。
"""
# 通过 re-export 保持单一配置源
# 主配置在 backend/config.py，此处仅做透传以兼容 app/* 旧代码
from config import settings  # noqa: F401

__all__ = ["settings"]
