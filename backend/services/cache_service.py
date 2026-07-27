"""Redis 缓存服务（S3-T02）

提供带降级 fallback 的 Redis 缓存层：
- Redis 可用时：缓存高频接口数据，减少 DB 查询
- Redis 不可用时：自动降级为直连 DB，不影响业务

缓存策略：
- TTL 过期（默认 300 秒）
- 主动失效（数据变更时清除缓存）
- 缓存命中/未命中日志（DEBUG 级别）

用法：
    from services.cache_service import cache_service

    # 获取缓存
    data = await cache_service.get("dashboard:overview")

    # 设置缓存
    await cache_service.set("dashboard:overview", data, ttl=300)

    # 删除缓存
    await cache_service.delete("dashboard:overview")

    # 装饰器模式（推荐）
    @cache_service.cached("dashboard:overview", ttl=300)
    async def get_overview():
        ...
"""
from __future__ import annotations

import functools
import json
import logging
from typing import Any, Callable, Optional

import redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis 缓存服务（带降级 fallback）

    Redis 不可用时自动降级为无缓存模式，
    所有 get 返回 None，set/delete 为空操作。
    """

    def __init__(self) -> None:
        self._client: Optional[redis.Redis] = None
        self._available: bool = False
        self._connect_attempts: int = 0
        self._max_reconnect_attempts: int = 3
        self._reconnect_interval: int = 60  # 重连间隔（秒）
        self._last_reconnect_time: float = 0

    def _get_client(self) -> Optional[redis.Redis]:
        """获取 Redis 客户端，带延迟初始化和自动重连"""
        if self._client is not None and self._available:
            return self._client

        # 限制重连频率
        import time
        now = time.time()
        if now - self._last_reconnect_time < self._reconnect_interval:
            return None

        self._last_reconnect_time = now
        self._connect_attempts += 1

        try:
            redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
            self._client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=False,
            )
            # 测试连接
            self._client.ping()
            self._available = True
            logger.info("Redis 缓存层已连接: %s", redis_url)
        except (RedisConnectionError, RedisTimeoutError, Exception) as e:
            self._available = False
            self._client = None
            if self._connect_attempts <= 1:
                logger.warning("Redis 不可用，降级为无缓存模式: %s", e)
        return self._client if self._available else None

    @property
    def is_available(self) -> bool:
        """Redis 是否可用"""
        return self._available

    # ==================================================================
    # 基础操作
    # ==================================================================
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存值，Redis 不可用时返回 None"""
        client = self._get_client()
        if client is None:
            return None

        try:
            data = client.get(key)
            if data is None:
                logger.debug("缓存未命中: %s", key)
                return None
            logger.debug("缓存命中: %s", key)
            return json.loads(data)
        except (RedisConnectionError, RedisTimeoutError):
            self._available = False
            logger.warning("Redis 读取失败，降级处理: %s", key)
            return None
        except (json.JSONDecodeError, TypeError):
            logger.warning("缓存数据反序列化失败: %s", key)
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> bool:
        """设置缓存值，带 TTL 过期"""
        client = self._get_client()
        if client is None:
            return False

        try:
            data = json.dumps(value, ensure_ascii=False, default=str)
            client.setex(key, ttl, data)
            logger.debug("缓存已设置: %s (TTL=%ds)", key, ttl)
            return True
        except (RedisConnectionError, RedisTimeoutError, TypeError) as e:
            self._available = False
            logger.warning("Redis 写入失败，降级处理: %s: %s", key, e)
            return False

    async def delete(self, *keys: str) -> int:
        """删除一个或多个缓存键"""
        client = self._get_client()
        if client is None:
            return 0

        try:
            deleted = client.delete(*keys)
            logger.debug("缓存已删除: %s (%d keys)", keys, deleted)
            return deleted
        except (RedisConnectionError, RedisTimeoutError):
            self._available = False
            return 0

    async def delete_pattern(self, pattern: str) -> int:
        """按模式删除缓存（如 dashboard:*）"""
        client = self._get_client()
        if client is None:
            return 0

        try:
            keys = list(client.scan_iter(match=pattern, count=100))
            if keys:
                deleted = client.delete(*keys)
                logger.debug("模式缓存已删除: %s (%d keys)", pattern, deleted)
                return deleted
            return 0
        except (RedisConnectionError, RedisTimeoutError):
            self._available = False
            return 0

    # ==================================================================
    # 缓存键生成工具
    # ==================================================================
    @staticmethod
    def key(*parts: str) -> str:
        """生成缓存键，如 cache_service.key("orders", "list", "page1")"""
        return ":".join(str(p) for p in parts)

    # ==================================================================
    # 装饰器模式（推荐使用）
    # ==================================================================
    def cached(self, key_prefix: str, ttl: int = 300, skip_cache: bool = False):
        """异步函数缓存装饰器

        用法：
            @cache_service.cached("dashboard:overview", ttl=300)
            async def get_overview():
                return expensive_db_query()

        参数：
            key_prefix: 缓存键前缀
            ttl: 缓存过期时间（秒）
            skip_cache: 是否跳过缓存（调试用）
        """

        def decorator(func: Callable):
            @functools.wraps(func)
            async def wrapper(*args, **kwargs):
                if skip_cache:
                    return await func(*args, **kwargs)

                # 生成缓存键
                cache_key = key_prefix
                # 如果有额外参数，追加到 key
                if kwargs:
                    # 对 kwargs 排序生成稳定的 key 后缀
                    sorted_kwargs = sorted(kwargs.items())
                    suffix = "&".join(f"{k}={v}" for k, v in sorted_kwargs)
                    cache_key = f"{key_prefix}:{suffix}"

                # 尝试读缓存
                cached = await self.get(cache_key)
                if cached is not None:
                    return cached

                # 执行函数
                result = await func(*args, **kwargs)

                # 写缓存
                await self.set(cache_key, result, ttl=ttl)

                return result

            return wrapper

        return decorator

    # ==================================================================
    # 缓存统计
    # ==================================================================
    def stats(self) -> dict:
        """返回缓存状态信息"""
        client = self._get_client()
        if client is None:
            return {
                "available": False,
                "connect_attempts": self._connect_attempts,
            }

        try:
            info = client.info("stats")
            return {
                "available": True,
                "connect_attempts": self._connect_attempts,
                "connected_clients": info.get("connected_clients", 0),
                "total_commands_processed": info.get("total_commands_processed", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0)
                    / max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                    * 100
                ),
            }
        except Exception:
            return {
                "available": self._available,
                "connect_attempts": self._connect_attempts,
            }


# ================================================================
# 模块级单例
# ================================================================

cache_service = CacheService()
