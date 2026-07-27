"""路网管理服务（S3-T04：动态图结构重构）

提供物流节点与链路的 CRUD 操作，供后台管理界面动态维护路网。
路网数据存储在 logistics_node / logistics_link 表中，
PPO 环境（environment_v2.py）通过本服务加载图拓扑。
"""
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from database import SessionLocal
from models.logistics_network import LogisticsLink, LogisticsNode
from schemas.logistics import (
    LogisticsLinkCreate,
    LogisticsLinkResponse,
    LogisticsLinkUpdate,
    LogisticsNodeCreate,
    LogisticsNodeUpdate,
)


class LogisticsNetworkService:
    """路网管理服务"""

    # ==================================================================
    # 内部工具
    # ==================================================================
    @staticmethod
    def _link_to_response(link: LogisticsLink) -> LogisticsLinkResponse:
        """将 ORM 链路对象转为响应模型（自动获取起终点编码）"""
        from_node_code = getattr(getattr(link, "from_node", None), "code", None) or ""
        to_node_code = getattr(getattr(link, "to_node", None), "code", None) or ""
        return LogisticsLinkResponse(
            id=link.id,
            transport_mode=link.transport_mode,
            base_cost_usd=link.base_cost_usd,
            base_time_days=link.base_time_days,
            base_carbon_kg=link.base_carbon_kg,
            base_risk=link.base_risk,
            distance_km=link.distance_km,
            is_active=link.is_active,
            from_node_code=from_node_code,
            to_node_code=to_node_code,
        )

    # ==================================================================
    # 节点管理
    # ==================================================================
    def list_nodes(
        self,
        db: Session,
        region: Optional[str] = None,
        node_type: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[int, List[LogisticsNode]]:
        """分页查询节点列表，支持区域/类型/启用状态筛选"""
        query = db.query(LogisticsNode)
        if region:
            query = query.filter(LogisticsNode.region == region)
        if node_type:
            query = query.filter(LogisticsNode.node_type == node_type)
        if is_active is not None:
            query = query.filter(LogisticsNode.is_active == is_active)
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return total, items

    def get_node_by_code(self, db: Session, code: str) -> Optional[LogisticsNode]:
        """按编码获取节点"""
        return db.query(LogisticsNode).filter(LogisticsNode.code == code).first()

    def get_node_by_id(self, db: Session, node_id: int) -> Optional[LogisticsNode]:
        """按 ID 获取节点"""
        return db.query(LogisticsNode).filter(LogisticsNode.id == node_id).first()

    def create_node(self, db: Session, data: LogisticsNodeCreate) -> LogisticsNode:
        """创建新节点，编码唯一冲突时抛出 ValueError"""
        existing = self.get_node_by_code(db, data.code)
        if existing:
            raise ValueError(f"节点编码已存在: {data.code}")
        node = LogisticsNode(**data.model_dump())
        db.add(node)
        db.commit()
        db.refresh(node)
        return node

    def update_node(
        self, db: Session, code: str, data: LogisticsNodeUpdate
    ) -> Optional[LogisticsNode]:
        """更新节点信息，返回更新后的节点；不存在返回 None"""
        node = self.get_node_by_code(db, code)
        if not node:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(node, key, value)
        db.commit()
        db.refresh(node)
        return node

    def delete_node(self, db: Session, code: str) -> bool:
        """删除节点（软删除：is_deleted=True），返回是否成功"""
        node = self.get_node_by_code(db, code)
        if not node:
            return False
        node.is_active = False
        node.is_deleted = True
        db.commit()
        return True

    # ==================================================================
    # 链路管理
    # ==================================================================
    def list_links(
        self,
        db: Session,
        from_node_code: Optional[str] = None,
        to_node_code: Optional[str] = None,
        transport_mode: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 200,
    ) -> tuple[int, List[LogisticsLinkResponse]]:
        """分页查询链路列表，支持起终点/运输方式/启用状态筛选"""
        base_query = db.query(LogisticsLink).options(
            joinedload(LogisticsLink.from_node),
            joinedload(LogisticsLink.to_node),
        )
        if from_node_code:
            from_node = self.get_node_by_code(db, from_node_code)
            if from_node:
                base_query = base_query.filter(LogisticsLink.from_node_id == from_node.id)
        if to_node_code:
            to_node = self.get_node_by_code(db, to_node_code)
            if to_node:
                base_query = base_query.filter(LogisticsLink.to_node_id == to_node.id)
        if transport_mode:
            base_query = base_query.filter(LogisticsLink.transport_mode == transport_mode)
        if is_active is not None:
            base_query = base_query.filter(LogisticsLink.is_active == is_active)
        total = base_query.count()
        items = base_query.offset(skip).limit(limit).all()
        return total, [self._link_to_response(link) for link in items]

    def get_link(
        self, db: Session, from_node_code: str, to_node_code: str, transport_mode: str
    ) -> Optional[LogisticsLinkResponse]:
        """按起终点+运输方式获取链路"""
        from_node = self.get_node_by_code(db, from_node_code)
        to_node = self.get_node_by_code(db, to_node_code)
        if not from_node or not to_node:
            return None
        link = (
            db.query(LogisticsLink)
            .options(
                joinedload(LogisticsLink.from_node),
                joinedload(LogisticsLink.to_node),
            )
            .filter(
                LogisticsLink.from_node_id == from_node.id,
                LogisticsLink.to_node_id == to_node.id,
                LogisticsLink.transport_mode == transport_mode,
            )
            .first()
        )
        return self._link_to_response(link) if link else None

    def create_link(self, db: Session, data: LogisticsLinkCreate) -> LogisticsLinkResponse:
        """创建新链路，起终点+方式冲突时抛出 ValueError"""
        from_node = self.get_node_by_code(db, data.from_node_code)
        to_node = self.get_node_by_code(db, data.to_node_code)
        if not from_node:
            raise ValueError(f"起点节点不存在: {data.from_node_code}")
        if not to_node:
            raise ValueError(f"终点节点不存在: {data.to_node_code}")

        existing = (
            db.query(LogisticsLink)
            .filter(
                LogisticsLink.from_node_id == from_node.id,
                LogisticsLink.to_node_id == to_node.id,
                LogisticsLink.transport_mode == data.transport_mode,
            )
            .first()
        )
        if existing:
            raise ValueError(
                f"链路已存在: {data.from_node_code} -> {data.to_node_code} ({data.transport_mode})"
            )

        link_data = data.model_dump(exclude={"from_node_code", "to_node_code"})
        link = LogisticsLink(
            from_node_id=from_node.id,
            to_node_id=to_node.id,
            **link_data,
        )
        db.add(link)
        db.commit()
        # 手动附加关联对象以避免额外查询
        link.from_node = from_node
        link.to_node = to_node
        db.refresh(link)
        return self._link_to_response(link)

    def _get_link_orm(
        self, db: Session, from_node_code: str, to_node_code: str, transport_mode: str
    ) -> Optional[LogisticsLink]:
        """获取 ORM 链路对象（内部用，不返回给 API）"""
        from_node = self.get_node_by_code(db, from_node_code)
        to_node = self.get_node_by_code(db, to_node_code)
        if not from_node or not to_node:
            return None
        return (
            db.query(LogisticsLink)
            .filter(
                LogisticsLink.from_node_id == from_node.id,
                LogisticsLink.to_node_id == to_node.id,
                LogisticsLink.transport_mode == transport_mode,
            )
            .first()
        )

    def update_link(
        self,
        db: Session,
        from_node_code: str,
        to_node_code: str,
        transport_mode: str,
        data: LogisticsLinkUpdate,
    ) -> Optional[LogisticsLinkResponse]:
        """更新链路信息，返回更新后的链路；不存在返回 None"""
        link = self._get_link_orm(db, from_node_code, to_node_code, transport_mode)
        if not link:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(link, key, value)
        db.commit()
        db.refresh(link)
        # 重新加载关联节点以获取 code
        db.query(LogisticsLink).options(
            joinedload(LogisticsLink.from_node),
            joinedload(LogisticsLink.to_node),
        ).filter(LogisticsLink.id == link.id).first()
        return self._link_to_response(link)

    def delete_link(
        self, db: Session, from_node_code: str, to_node_code: str, transport_mode: str
    ) -> bool:
        """删除链路（软删除：is_active=False），返回是否成功"""
        link = self._get_link_orm(db, from_node_code, to_node_code, transport_mode)
        if not link:
            return False
        link.is_active = False
        db.commit()
        return True

    # ==================================================================
    # 图结构加载（供 PPO 环境使用）
    # ==================================================================
    def load_active_graph(self, db: Session) -> tuple[List[LogisticsNode], List[LogisticsLink]]:
        """加载全部启用的节点与链路，供 PPO 环境构建图结构"""
        nodes = db.query(LogisticsNode).filter(LogisticsNode.is_active.is_(True)).all()
        links = db.query(LogisticsLink).filter(LogisticsLink.is_active.is_(True)).all()
        return nodes, links


logistics_network_service = LogisticsNetworkService()
