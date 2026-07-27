"""模型权重保存/加载/部署管理

本地文件系统管理模型版本，每个模型对应唯一 model_id（格式：ppo_YYYYMMDD_HHMMSS）。
存储目录：backend/agent/saved_models/
"""
from __future__ import annotations

import json
import os
import threading
from datetime import datetime
from typing import Any, Dict, List, Optional

from .ppo_agent import PPOAgent, build_agent, get_backend, HAS_TORCH


# 模型存储根目录
_MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saved_models")
_META_FILE = os.path.join(_MODELS_DIR, "_registry.json")
_ACTIVE_FILE = os.path.join(_MODELS_DIR, "_active.txt")


def _ensure_dir() -> None:
    os.makedirs(_MODELS_DIR, exist_ok=True)


def _now_str() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def _now_compact() -> str:
    return datetime.now().strftime("%Y%m%d_%H%M%S")


def _now_date() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def _load_registry() -> Dict[str, Dict[str, Any]]:
    """加载模型注册表"""
    if not os.path.exists(_META_FILE):
        return {}
    try:
        with open(_META_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return {}


def _save_registry(registry: Dict[str, Dict[str, Any]]) -> None:
    _ensure_dir()
    with open(_META_FILE, "w", encoding="utf-8") as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)


def _load_active() -> Optional[str]:
    if not os.path.exists(_ACTIVE_FILE):
        return None
    try:
        with open(_ACTIVE_FILE, "r", encoding="utf-8") as f:
            return f.read().strip() or None
    except OSError:
        return None


def _save_active(model_id: Optional[str]) -> None:
    _ensure_dir()
    with open(_ACTIVE_FILE, "w", encoding="utf-8") as f:
        f.write(model_id or "")


def _model_path(model_id: str) -> str:
    """模型权重文件路径"""
    suffix = ".pt" if HAS_TORCH else ".pkl"
    return os.path.join(_MODELS_DIR, f"{model_id}{suffix}")


class ModelStorage:
    """模型存储管理器（线程安全）"""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        _ensure_dir()

    def save_model(self, agent: PPOAgent, params: Optional[dict] = None,
                   version_name: Optional[str] = None,
                   reward: float = 0.0) -> str:
        """保存模型权重

        Args:
            agent: PPO 智能体
            params: 训练参数（用于元信息记录）
            version_name: 版本名称
            reward: 训练最终奖励
        Returns:
            model_id（格式：ppo_YYYYMMDD_HHMMSS）
        """
        with self._lock:
            # 处理同秒内多次保存（追加序号）
            base = f"ppo_{_now_compact()}"
            model_id = base
            registry = _load_registry()
            suffix = 1
            while model_id in registry:
                model_id = f"{base}_{suffix}"
                suffix += 1
            path = _model_path(model_id)
            agent.save(path)
            registry[model_id] = {
                "model_id": model_id,
                "version_name": version_name or model_id,
                "created_at": _now_str(),
                "created_date": _now_date(),
                "reward": float(reward),
                "status": "saved",
                "params": params or {},
                "backend": get_backend(),
                "action_dim": agent.action_dim,
                "state_dim": agent.state_dim,
            }
            _save_registry(registry)
            return model_id

    def list_models(self) -> List[Dict[str, Any]]:
        """返回所有模型元信息列表（按创建时间倒序）"""
        with self._lock:
            registry = _load_registry()
            items = list(registry.values())
            # 按创建时间倒序
            items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            # 标记部署状态
            active = _load_active()
            for it in items:
                it["is_active"] = (it["model_id"] == active)
            return items

    def deploy_model(self, model_id: str) -> bool:
        """设置全局生效模型"""
        with self._lock:
            registry = _load_registry()
            if model_id not in registry:
                return False
            # 更新状态：其它 deployed -> archived
            for mid, meta in registry.items():
                if meta.get("status") == "deployed":
                    meta["status"] = "archived"
            registry[model_id]["status"] = "deployed"
            _save_registry(registry)
            _save_active(model_id)
            return True

    def get_active_model_id(self) -> Optional[str]:
        """获取当前部署的模型ID"""
        return _load_active()

    def load_agent(self, model_id: str) -> Optional[PPOAgent]:
        """加载指定模型为智能体"""
        with self._lock:
            registry = _load_registry()
            meta = registry.get(model_id)
            if meta is None:
                return None
            path = _model_path(model_id)
            if not os.path.exists(path):
                return None
            params = meta.get("params", {})
            action_dim = int(meta.get("action_dim", 48))
            agent = build_agent(action_dim, params)
            try:
                agent.load(path)
            except Exception:
                return None
            return agent

    def get_active_agent(self) -> Optional[PPOAgent]:
        """获取当前部署模型的智能体实例"""
        mid = _load_active()
        if mid is None:
            return None
        return self.load_agent(mid)

    def get_model_meta(self, model_id: str) -> Optional[Dict[str, Any]]:
        """获取模型元信息"""
        with self._lock:
            registry = _load_registry()
            return registry.get(model_id)

    def delete_model(self, model_id: str) -> bool:
        """删除模型"""
        with self._lock:
            registry = _load_registry()
            if model_id not in registry:
                return False
            path = _model_path(model_id)
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass
            del registry[model_id]
            _save_registry(registry)
            if _load_active() == model_id:
                _save_active(None)
            return True


# 全局单例
model_storage = ModelStorage()
