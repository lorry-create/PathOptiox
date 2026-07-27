"""风险预警模块业务服务层

数据库持久化版本，字段对齐前端 risk.mock.ts。
- 表模型：models/alert.py 的 Alert（业务ID存 alert_no 字段）
- S2-T01: affected_orders 改用 alert_order_rel 中间表（替代原 JSON 列）
- S2-T03: time 字段为 DATETIME 类型，服务层负责与 "YYYY-MM-DD HH:mm" 字符串互转
- level 枚举存小写字符串
"""
from datetime import datetime
from typing import List, Optional

from database import get_db_session
from models.alert import Alert, AlertOrderRel
from models.order import Order
from schemas.alert import AlertItem
from schemas.enums import RiskLevel


def _get_affected_order_nos(db, alert_id: int) -> List[str]:
    """通过中间表查询预警受影响的订单编号列表（S2-T01）"""
    rows = (
        db.query(Order.order_no)
        .join(AlertOrderRel, AlertOrderRel.order_id == Order.id)
        .filter(AlertOrderRel.alert_id == alert_id)
        .all()
    )
    return [row[0] for row in rows]


def _datetime_to_str(dt) -> str:
    """将 datetime 对象转为 "YYYY-MM-DD HH:mm" 字符串（S2-T03）

    兼容已是字符串或 None 的情况，确保 API 响应始终返回字符串。
    """
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d %H:%M")
    return str(dt)


def _to_item(orm: Alert, affected_order_nos: List[str]) -> AlertItem:
    """ORM 对象转 AlertItem（alert_no -> id，affected_orders 从中间表获取）

    S2-T03: time 字段从 datetime 对象转为 "YYYY-MM-DD HH:mm" 字符串返回。
    """
    return AlertItem(
        id=orm.alert_no,
        level=RiskLevel(orm.level),
        title=orm.title,
        content=orm.content,
        time=_datetime_to_str(orm.time),
        affected_route=orm.affected_route,
        affected_orders=affected_order_nos,
        daily_loss=orm.daily_loss,
        ai_suggestion=orm.ai_suggestion or "",
        handled=orm.handled,
    )


class AlertService:
    """风险预警服务（数据库持久化版）"""

    def list_alerts(
        self,
        level: Optional[str] = None,
        handled: Optional[bool] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> dict:
        """分页查询预警，支持 level/handled 过滤

        S2-T02: 自动过滤 is_deleted=False
        """
        with get_db_session() as db:
            q = db.query(Alert).filter(Alert.is_deleted.is_(False))
            if level:
                q = q.filter(Alert.level == level)
            if handled is not None:
                q = q.filter(Alert.handled == handled)
            total = q.count()
            start = (page - 1) * page_size
            rows = q.order_by(Alert.created_at.desc()).offset(start).limit(page_size).all()
            page_items = []
            for r in rows:
                affected = _get_affected_order_nos(db, r.id)
                page_items.append(_to_item(r, affected))
        return {
            "list": page_items,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    def get_alert(self, alert_id: str) -> Optional[AlertItem]:
        """查询预警详情（S2-T02: 排除已软删除）"""
        with get_db_session() as db:
            row = (
                db.query(Alert)
                .filter(Alert.alert_no == alert_id, Alert.is_deleted.is_(False))
                .first()
            )
            if row is None:
                return None
            affected = _get_affected_order_nos(db, row.id)
            return _to_item(row, affected)

    def handle_alert(self, alert_id: str, handler_user_id: Optional[int] = None) -> bool:
        """标记预警已处置，并记录处置人（S2-T01: handled_by 外键）"""
        with get_db_session() as db:
            row = (
                db.query(Alert)
                .filter(Alert.alert_no == alert_id, Alert.is_deleted.is_(False))
                .first()
            )
            if row is None:
                return False
            row.handled = True
            if handler_user_id is not None:
                row.handled_by = handler_user_id
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            return True


alert_service = AlertService()
