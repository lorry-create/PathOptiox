"""日志配置模块

使用 logging.config.dictConfig 进行结构化日志配置：
- console handler：控制台输出（INFO 级别，开发友好）
- file handler：滚动文件日志（DEBUG 级别，含完整堆栈，运维排查用）
- pathoptix logger：业务日志，同时输出到控制台和文件
- 500 异常的完整堆栈通过 logger.exception 记录到此 logger

日志文件位置：backend/logs/pathoptix.log（自动创建目录）
单文件上限 10MB，保留 5 个备份。
"""
import logging.config
import os


LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
        },
        "detailed": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s | %(filename)s:%(lineno)d | %(message)s"
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "default",
            "stream": "ext://sys.stdout",
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "detailed",
            "filename": "logs/pathoptix.log",
            "maxBytes": 10485760,
            "backupCount": 5,
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "pathoptix": {
            "level": "DEBUG",
            "handlers": ["console", "file"],
            "propagate": False,
        },
        "uvicorn": {
            "level": "INFO",
            "handlers": ["console"],
            "propagate": False,
        },
    },
    "root": {
        "level": "WARNING",
        "handlers": ["console"],
    },
}


def setup_logging() -> None:
    """初始化日志系统：创建日志目录并应用 dictConfig 配置"""
    os.makedirs("logs", exist_ok=True)
    logging.config.dictConfig(LOGGING_CONFIG)
