"""系统配置业务服务层

S2-T06: system_config 表接入系统设置模块
- 提供批量读取、批量更新配置项的能力
- 默认配置项在 init_db 中 seed
- 极绿调度状态由 carbon_service 写入，本服务仅负责读取/汇总
"""
from typing import Dict, List, Tuple

from database import get_db_session
from models.system_config import SystemConfig
from schemas.system_config import SystemConfigItem


# ===== 默认配置项（首次启动时 seed 到数据库）=====
# 注意：极绿调度状态由 carbon_service 管理，不在此处 seed
DEFAULT_CONFIGS: List[Tuple[str, str, str]] = [
    # (config_key, config_value, description)
    ("green_mode_enabled", "false", "极绿调度开关 (true/false)"),
    ("agent_auto_mode", "true", "Agent 全托管开关 (true/false)"),
    ("rag_enabled", "true", "RAG 感知开关 (true/false)"),
    ("current_model_id", "net_global_v3", "当前生效模型 ID"),
    # 预警系统阈值
    ("alert_threshold_delay_hours", "24", "延迟预警阈值（小时）"),
    ("alert_threshold_congestion_pct", "70", "拥堵预警阈值（百分比）"),
    ("alert_threshold_risk_score", "60", "风险评分预警阈值（0-100）"),
    # 数据同步策略
    ("data_sync_strategy", "realtime", "数据同步策略 (realtime/hourly/daily)"),
    # 调度权重
    ("scheduling_weight_energy", "75", "能效优先权重 (0-100)"),
    ("scheduling_weight_latency", "30", "延迟敏感权重 (0-100)"),
    ("scheduling_weight_redundancy", "60", "路径冗余权重 (0-100)"),
    ("scheduling_weight_budget", "45", "成本控制权重 (0-100)"),
]


class SystemConfigService:
    """系统配置服务（CRUD on system_config 表）"""

    def list_all(self) -> List[SystemConfigItem]:
        """返回全部配置项列表"""
        with get_db_session() as db:
            rows = (
                db.query(SystemConfig)
                .filter(SystemConfig.is_deleted.is_(False))
                .order_by(SystemConfig.config_key)
                .all()
            )
            return [
                SystemConfigItem(
                    config_key=r.config_key,
                    config_value=r.config_value,
                    description=r.description,
                )
                for r in rows
            ]

    def get_dict(self) -> Dict[str, str]:
        """返回配置键值对字典 { config_key: config_value }"""
        with get_db_session() as db:
            rows = (
                db.query(SystemConfig)
                .filter(SystemConfig.is_deleted.is_(False))
                .all()
            )
            return {r.config_key: r.config_value or "" for r in rows}

    def get(self, key: str, default: str = "") -> str:
        """读取单个配置值，键不存在时返回 default"""
        with get_db_session() as db:
            row = (
                db.query(SystemConfig)
                .filter(
                    SystemConfig.config_key == key,
                    SystemConfig.is_deleted.is_(False),
                )
                .first()
            )
            return row.config_value if row else default

    def get_bool(self, key: str, default: bool = False) -> bool:
        """读取布尔型配置（值为 'true' 时返回 True，其他返回 False）"""
        val = self.get(key, "").lower()
        if not val:
            return default
        return val == "true"

    def upsert(self, key: str, value: str, description: str = "") -> None:
        """插入或更新单个配置项"""
        with get_db_session() as db:
            row = (
                db.query(SystemConfig)
                .filter(SystemConfig.config_key == key)
                .first()
            )
            if row is None:
                row = SystemConfig(
                    config_key=key,
                    config_value=value,
                    description=description,
                )
                db.add(row)
            else:
                row.config_value = value
                if description:
                    row.description = description
                # 软删除恢复
                if row.is_deleted:
                    row.is_deleted = False
                    row.deleted_at = None
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise

    def update_many(self, configs: Dict[str, str]) -> List[str]:
        """批量更新配置项

        Returns:
            已更新的键列表
        """
        updated_keys: List[str] = []
        with get_db_session() as db:
            for key, value in configs.items():
                row = (
                    db.query(SystemConfig)
                    .filter(SystemConfig.config_key == key)
                    .first()
                )
                if row is None:
                    db.add(
                        SystemConfig(
                            config_key=key,
                            config_value=value,
                            description="",
                        )
                    )
                else:
                    row.config_value = value
                    if row.is_deleted:
                        row.is_deleted = False
                        row.deleted_at = None
                updated_keys.append(key)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
        return updated_keys

    def seed_defaults(self) -> None:
        """seed 默认配置项（仅当键不存在时插入）"""
        with get_db_session() as db:
            for key, value, desc in DEFAULT_CONFIGS:
                existing = (
                    db.query(SystemConfig)
                    .filter(SystemConfig.config_key == key)
                    .first()
                )
                if existing is None:
                    db.add(
                        SystemConfig(
                            config_key=key,
                            config_value=value,
                            description=desc,
                        )
                    )
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise


system_config_service = SystemConfigService()
