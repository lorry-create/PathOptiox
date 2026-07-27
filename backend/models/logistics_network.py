"""路网结构 ORM 模型（Phase A：动态图结构重构）

将原本硬编码在 `backend/rl/environment.py` 中的 12 节点 24 链路迁移到 SQLite，
支持运营人员后台维护路网、动态增删节点/链路、多租户路网隔离。

本模块向后兼容：`optimization_service.py` 仍可调用旧的 `environment.py` 常量，
本模块仅作为 Phase A 的物理表结构搭建，不强制业务层切换数据源。
切换时机由 `LogisticsEnv` 下一阶段重构决定。

表清单：
    - logistics_node        节点表（港口/机场/城市/仓库）
    - logistics_link        链路表（陆运/铁路/海运/空运）
    - link_price_factor     动态价格系数表（季节/油价/拥堵/事件）
    - scene_factor          场景系数表（normal/stress/policy）
"""
from datetime import date

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from .base import BaseModel


# ====================================================================
# 节点表
# ====================================================================
class LogisticsNode(BaseModel):
    """物流节点（港口 / 机场 / 城市 / 仓库）

    替代 `environment.py` 中的 `NODES` 常量。
    支持动态增删：新增节点仅需 INSERT 一条记录，无需重训 PPO 模型
    （Phase B GNN 重构后状态空间与节点数解耦）。
    """

    __tablename__ = "logistics_node"
    __table_args__ = (
        Index("ix_logistics_node_region", "region"),
        Index("ix_logistics_node_type", "node_type"),
        {"comment": "物流节点表（港口/机场/城市/仓库）"},
    )

    # 业务编码（前端传入的城市 ID，如 'shenzhen'、'new_york'）
    # 唯一索引，作为业务主键使用
    code = Column(String(32), unique=True, index=True, nullable=False, comment="节点编码（英文，全局唯一）")

    # 中英文名称（用于 UI 显示与 LLM 解释）
    name_cn = Column(String(64), nullable=False, comment="中文名称")
    name_en = Column(String(64), nullable=True, comment="英文名称")

    # 国家与区域（用于多租户路网隔离与区域筛选）
    country = Column(String(32), nullable=True, comment="国家")
    region = Column(
        String(32),
        nullable=False,
        default="global",
        comment="区域编码：asia_east/asia_se/europe_w/europe_e/na_w/na_e/oceania/mideast",
    )

    # 节点类型（用于 GNN 节点特征 one-hot 编码）
    # port=港口, airport=机场, warehouse=仓库, city=城市
    node_type = Column(String(16), nullable=False, default="city", comment="节点类型: port/airport/warehouse/city")

    # 地理坐标（用于距离计算与地图可视化）
    lat = Column(Float, nullable=True, comment="纬度")
    lng = Column(Float, nullable=True, comment="经度")

    # 是否为枢纽节点（影响 GNN 注意力权重初始化与 UI 高亮显示）
    is_hub = Column(Boolean, nullable=False, default=False, comment="是否为枢纽节点")

    # 是否启用（软删除标记，便于临时下线节点而不删除数据）
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")

    # 关联链路（反向关系，便于查询节点的所有出入边）
    out_links = relationship(
        "LogisticsLink",
        foreign_keys="LogisticsLink.from_node_id",
        back_populates="from_node",
        lazy="dynamic",
    )
    in_links = relationship(
        "LogisticsLink",
        foreign_keys="LogisticsLink.to_node_id",
        back_populates="to_node",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return f"<LogisticsNode(code={self.code!r}, name_cn={self.name_cn!r}, type={self.node_type!r})>"


# ====================================================================
# 链路表
# ====================================================================
class LogisticsLink(BaseModel):
    """运输链路（陆运 / 铁路 / 海运 / 空运）

    替代 `environment.py` 中的 `LINKS_RAW` 常量。
    每条链路单向存储，反向链路需显式插入（与原 environment 一致）。

    基础属性（base_*）为静态值，运行时通过 `LinkPriceFactor` 动态调整。
    """

    __tablename__ = "logistics_link"
    __table_args__ = (
        # 唯一约束：同一起终点 + 同一运输方式仅允许一条链路
        UniqueConstraint("from_node_id", "to_node_id", "transport_mode", name="uq_link_from_to_mode"),
        Index("ix_logistics_link_from", "from_node_id"),
        Index("ix_logistics_link_to", "to_node_id"),
        Index("ix_logistics_link_mode", "transport_mode"),
        {"comment": "运输链路表（陆运/铁路/海运/空运）"},
    )

    # 起终点（外键关联 LogisticsNode）
    from_node_id = Column(
        Integer,
        ForeignKey("logistics_node.id", ondelete="CASCADE"),
        nullable=False,
        comment="起点节点 ID",
    )
    to_node_id = Column(
        Integer,
        ForeignKey("logistics_node.id", ondelete="CASCADE"),
        nullable=False,
        comment="终点节点 ID",
    )

    # 运输方式：land(陆运) / rail(铁路) / sea(海运) / air(空运)
    transport_mode = Column(
        String(16),
        nullable=False,
        comment="运输方式: land/rail/sea/air",
    )

    # 基础属性（静态值，对应原 LINKS_RAW 中的字段）
    base_cost_usd = Column(Float, nullable=False, comment="基础成本（美元）")
    base_time_days = Column(Float, nullable=False, comment="基础时效（天）")
    base_carbon_kg = Column(Float, nullable=False, comment="基础碳排放（kg）")
    base_risk = Column(Float, nullable=False, default=0.05, comment="基础风险值（0-1）")

    # 距离（公里，用于碳排精细计算与 UI 展示）
    distance_km = Column(Float, nullable=True, comment="距离（公里）")

    # 是否启用
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")

    # 关联关系
    from_node = relationship("LogisticsNode", foreign_keys=[from_node_id], back_populates="out_links")
    to_node = relationship("LogisticsNode", foreign_keys=[to_node_id], back_populates="in_links")
    price_factors = relationship(
        "LinkPriceFactor",
        back_populates="link",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    def __repr__(self) -> str:
        return (
            f"<LogisticsLink(from={self.from_node_id}, to={self.to_node_id}, "
            f"mode={self.transport_mode!r}, cost={self.base_cost_usd})>"
        )


# ====================================================================
# 动态价格系数表
# ====================================================================
class LinkPriceFactor(BaseModel):
    """链路动态价格系数

    用于实现运价波动、港口拥堵、油价调整、突发事件等动态因素。
    运行时由 `LogisticsEnv` 加载并应用到对应链路的 base_* 属性上。

    支持的系数类型：
        - season:        季节性波动（如旺季 +20%）
        - oil:           油价调整（如油价上涨 +15%）
        - congestion:    港口拥堵（如洛杉矶港拥堵时效 +50%）
        - event:         突发事件（如台风、罢工、运河堵塞）
        - policy:        政策调整（如关税、限行）
    """

    __tablename__ = "link_price_factor"
    __table_args__ = (
        Index("ix_link_price_factor_link", "link_id"),
        Index("ix_link_price_factor_valid", "valid_from", "valid_to"),
        {"comment": "链路动态价格系数表"},
    )

    link_id = Column(
        Integer,
        ForeignKey("logistics_link.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联链路 ID",
    )

    # 系数类型
    factor_type = Column(
        String(32),
        nullable=False,
        comment="系数类型: season/oil/congestion/event/policy",
    )

    # 系数值（1.0=不变, 1.2=+20%, 0.8=-20%）
    # 应用到哪个字段由 apply_target 决定
    factor_value = Column(Float, nullable=False, comment="系数值（1.0=不变）")

    # 应用目标：cost / time / carbon / risk
    apply_target = Column(
        String(16),
        nullable=False,
        default="cost",
        comment="应用目标: cost/time/carbon/risk",
    )

    # 有效期（支持时间窗口，过期自动失效）
    valid_from = Column(Date, nullable=False, default=date.today, comment="生效起始日期")
    valid_to = Column(Date, nullable=False, default=date.today, comment="生效结束日期")

    # 原因说明（便于审计与 UI 展示）
    reason = Column(Text, nullable=True, comment="调价原因")

    # 关联关系
    link = relationship("LogisticsLink", back_populates="price_factors")

    def __repr__(self) -> str:
        return (
            f"<LinkPriceFactor(link={self.link_id}, type={self.factor_type!r}, "
            f"value={self.factor_value}, target={self.apply_target!r})>"
        )


# ====================================================================
# 场景系数表
# ====================================================================
class SceneFactor(BaseModel):
    """场景系数表

    替代 `environment.py` 中的 `SCENE_FACTORS` 常量。
    支持运营人员后台维护场景系数，无需修改代码。

    场景系数应用到链路的 base_* 属性上（在 LinkPriceFactor 之后应用）。
    """

    __tablename__ = "scene_factor"
    __table_args__ = (
        UniqueConstraint("scene_code", name="uq_scene_factor_code"),
        {"comment": "场景系数表"},
    )

    # 场景编码：normal / stress / policy
    scene_code = Column(String(32), nullable=False, comment="场景编码: normal/stress/policy")

    # 成本系数（1.0=不变）
    cost_multiplier = Column(Float, nullable=False, default=1.0, comment="成本系数")

    # 时效系数
    time_multiplier = Column(Float, nullable=False, default=1.0, comment="时效系数")

    # 风险系数
    risk_multiplier = Column(Float, nullable=False, default=1.0, comment="风险系数")

    # 描述
    description = Column(Text, nullable=True, comment="场景描述")

    def __repr__(self) -> str:
        return (
            f"<SceneFactor(scene={self.scene_code!r}, "
            f"cost×{self.cost_multiplier}, time×{self.time_multiplier}, risk×{self.risk_multiplier})>"
        )
