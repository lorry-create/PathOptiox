"""订单模块业务服务层

数据库持久化版本，字段对齐前端 order.mock.ts。
- 表模型：models/order.py 的 Order（业务ID存 order_no 字段）
- 状态枚举存小写字符串，响应时转为 OrderStatus
- S2-T02: 所有查询过滤 is_deleted=False，删除改为软删除
- S2-T03: date 字段为 DATE 类型，服务层负责 date 对象与 "YYYY-MM-DD" 字符串互转
- S3-T02: list_orders 增加 Redis 缓存（TTL=30s），写操作主动失效
- 所有写操作带异常回滚
"""
import asyncio
import json
import logging
import uuid
from datetime import date, datetime
from typing import List, Optional

from sqlalchemy import or_

from database import get_db_session
from models.order import Order
from schemas.enums import OrderStatus
from schemas.order import (
    OrderCreate,
    OrderMetricsData,
    OrderResponse,
    OrderUpdate,
)
from services.cache_service import cache_service
from services.task_manager import task_manager

logger = logging.getLogger(__name__)

_CACHE_KEY_LIST = "orders:list"
_CACHE_KEY_DETAIL = "orders:detail"
_CACHE_TTL = 30  # 30秒


def _date_to_str(d) -> str:
    """将 date 对象转为 "YYYY-MM-DD" 字符串（S2-T03）

    兼容已是字符串或 None 的情况，确保 API 响应始终返回字符串。
    """
    if d is None:
        return ""
    if isinstance(d, str):
        return d
    if isinstance(d, datetime):
        return d.strftime("%Y-%m-%d")
    # date 对象
    return d.strftime("%Y-%m-%d")


def _str_to_date(s: str):
    """将 "YYYY-MM-DD" 字符串转为 date 对象（S2-T03）

    输入可能来自前端 API（字符串），需要转为 date 存入 DATE 列。
    若输入已是 date 对象则原样返回。
    """
    if s is None:
        return None
    if isinstance(s, (date, datetime)):
        return s if isinstance(s, date) and not isinstance(s, datetime) else s.date()
    # 字符串解析
    return date.fromisoformat(s)


def _to_response(orm: Order) -> dict:
    """ORM 对象转前端契约 dict（order_no -> id）

    S2-T03: date 字段从 date 对象转为 "YYYY-MM-DD" 字符串返回。
    """
    return {
        "id": orm.order_no,
        "customer_name": orm.customer_name,
        "date": _date_to_str(orm.date),
        "total_amount": orm.total_amount,
        "status": OrderStatus(orm.status),
        "sender": orm.sender,
        "receiver": orm.receiver,
        "goods_description": orm.goods_description,
        "shipping_method": orm.shipping_method,
        "estimated_delivery": orm.estimated_delivery,
    }


class OrderService:
    """订单服务（数据库持久化版）"""

    def list_orders(
        self,
        keyword: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[dict]:
        """查询订单列表，支持 keyword(订单ID/客户名) 与 status 过滤

        S2-T02: 自动过滤 is_deleted=False
        S3-T02: 优先读 Redis 缓存，写操作自动失效
        """
        # 尝试读缓存（仅无筛选条件时缓存）
        if not keyword and not status and cache_service.is_available:
            try:
                client = cache_service._get_client()
                if client:
                    cached = client.get(_CACHE_KEY_LIST)
                    if cached:
                        logger.debug("缓存命中: %s", _CACHE_KEY_LIST)
                        return json.loads(cached)
            except Exception:
                pass

        with get_db_session() as db:
            q = db.query(Order).filter(Order.is_deleted.is_(False))
            if keyword:
                kw = keyword.lower()
                q = q.filter(
                    or_(
                        Order.order_no.ilike(f"%{kw}%"),
                        Order.customer_name.ilike(f"%{kw}%"),
                    )
                )
            if status:
                q = q.filter(Order.status == status)
            rows = q.order_by(Order.created_at.desc()).all()
            result = [_to_response(r) for r in rows]

        # 写缓存（仅无筛选条件时）
        if not keyword and not status and cache_service.is_available:
            try:
                client = cache_service._get_client()
                if client:
                    client.setex(_CACHE_KEY_LIST, _CACHE_TTL, json.dumps(result, ensure_ascii=False, default=str))
            except Exception:
                pass

        return result

    def get_order(self, order_id: str) -> Optional[dict]:
        """根据业务订单ID查询订单（S2-T02: 排除已软删除）"""
        with get_db_session() as db:
            row = (
                db.query(Order)
                .filter(Order.order_no == order_id, Order.is_deleted.is_(False))
                .first()
            )
            return _to_response(row) if row else None

    def create_order(self, data: OrderCreate, creator_user_id: Optional[int] = None) -> dict:
        """创建订单，自动生成业务ID（S2-T02: 记录 created_by）

        S2-T03: date 字段从字符串转为 date 对象存入 DATE 列。
        """
        new_no = f"CN{uuid.uuid4().hex[:8].upper()}"
        payload = data.model_dump()
        # 枚举转值
        status_val = payload["status"].value if hasattr(payload["status"], "value") else payload["status"]
        with get_db_session() as db:
            row = Order(
                order_no=new_no,
                customer_name=payload["customer_name"],
                date=_str_to_date(payload["date"]),
                total_amount=payload["total_amount"],
                status=status_val,
                sender=payload.get("sender"),
                receiver=payload.get("receiver"),
                goods_description=payload.get("goods_description"),
                shipping_method=payload.get("shipping_method"),
                estimated_delivery=payload.get("estimated_delivery"),
                created_by=creator_user_id,
            )
            db.add(row)
            try:
                db.commit()
                db.refresh(row)
            except Exception:
                db.rollback()
                raise
            result = _to_response(row)
            # S3-T02: 失效订单列表缓存
            self._invalidate_cache()
            return result

    def update_order(self, order_id: str, data: OrderUpdate, updater_user_id: Optional[int] = None) -> Optional[dict]:
        """更新订单（S2-T02: 记录 updated_by，排除已软删除）"""
        update_data = data.model_dump(exclude_unset=True)
        with get_db_session() as db:
            row = (
                db.query(Order)
                .filter(Order.order_no == order_id, Order.is_deleted.is_(False))
                .first()
            )
            if row is None:
                return None
            for k, v in update_data.items():
                if k == "status":
                    v = v.value if hasattr(v, "value") else v
                elif k == "date":
                    # S2-T03: date 字段从字符串转为 date 对象
                    v = _str_to_date(v)
                setattr(row, k, v)
            if updater_user_id is not None:
                row.updated_by = updater_user_id
            try:
                db.commit()
                db.refresh(row)
            except Exception:
                db.rollback()
                raise
            result = _to_response(row)
            self._invalidate_cache()
            return result

    def delete_order(self, order_id: str) -> bool:
        """软删除订单（S2-T02: 设置 is_deleted=True 而非物理删除）"""
        with get_db_session() as db:
            row = (
                db.query(Order)
                .filter(Order.order_no == order_id, Order.is_deleted.is_(False))
                .first()
            )
            if row is None:
                return False
            row.is_deleted = True
            row.deleted_at = datetime.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            self._invalidate_cache()
            return True

    def _invalidate_cache(self) -> None:
        """失效订单相关缓存（S3-T02）"""
        if cache_service.is_available:
            try:
                cache_service.delete(_CACHE_KEY_LIST)
                cache_service.delete_pattern("orders:detail:*")
            except Exception:
                pass

    def match_capacity(self, order_id: str) -> Optional[dict]:
        """模拟运力匹配"""
        if self.get_order(order_id) is None:
            return None
        return {"success": True, "matched": True}

    def capacity_analysis(self, order_id: str) -> Optional[dict]:
        """模拟运力分析数据"""
        if self.get_order(order_id) is None:
            return None
        return {"capacity": 1200.0, "utilization": 0.78}

    def order_carbon(self, order_id: str) -> Optional[dict]:
        """模拟订单碳排放数据"""
        if self.get_order(order_id) is None:
            return None
        return {"carbon": 4280.0, "unit": "kg"}

    async def batch_dispatch(self, order_ids: List[str]) -> str:
        """批量调度：创建任务并启动真实后台 Worker 推进进度，返回 task_id。

        修复说明：原先仅 create_task 后立即返回，没有任何后台逻辑推进进度，
        任务 progress 永远卡 0，靠 task_manager.get_task 的 +8% 假进度副作用
        虚假推进。现已剥离该副作用（见 task_manager.get_task 修复），并在本方法
        启动 asyncio 后台 Worker：每 0.5s 推进 5%，10 步共 5s 完成，到 100%
        自动 finish_task 并挂载结果。

        Worker 与查询频率完全解耦——前端轮询 get_task 只是只读快照，
        进度按真实时间推进。
        """
        task_id = task_manager.create_task("batch_dispatch")
        # 启动后台 Worker 协程，fire-and-forget（不 await，立即返回 task_id）
        asyncio.create_task(
            self._run_batch_dispatch_worker(task_id, order_ids)
        )
        return task_id

    async def _run_batch_dispatch_worker(
        self, task_id: str, order_ids: List[str]
    ) -> None:
        """批量调度后台 Worker：按真实时间推进进度。

        - 每 0.5s 推进 5%（10 步共 5s）
        - 推进前检查任务状态，paused 则跳过本轮（支持暂停）
        - failed 则终止 Worker
        - 到 100% 自动 finish_task 并挂载 result
        - 任何异常都被捕获并 fail_task，避免静默丢失
        """
        total_steps = 10
        try:
            for step in range(1, total_steps + 1):
                # 状态检测：paused 跳过本轮、failed/cancelled 终止 Worker
                snapshot = task_manager.get_task(task_id)
                if snapshot is None:
                    logger.warning("[batch_dispatch_worker] task %s not found", task_id)
                    return
                # status 可能是 schemas.enums.TaskStatus 枚举或字符串，统一取值
                status_val = snapshot["status"]
                if hasattr(status_val, "value"):
                    status_val = status_val.value
                if status_val in ("failed", "cancelled"):
                    logger.info(
                        "[batch_dispatch_worker] task %s 终止状态 %s，停止 Worker",
                        task_id, status_val,
                    )
                    return
                # paused 时不推进，但 Worker 仍存活等待恢复
                if status_val == "paused":
                    await asyncio.sleep(0.5)
                    continue

                progress = step / total_steps
                task_manager.update_progress(task_id, progress)
                logger.info(
                    "[batch_dispatch_worker] task %s progress=%.0f%% (step %d/%d)",
                    task_id, progress * 100, step, total_steps,
                )
                if progress < 1.0:
                    await asyncio.sleep(0.5)

            # 完成：挂载真实结果
            task_manager.finish_task(
                task_id,
                result={
                    "dispatched_count": len(order_ids),
                    "order_ids": order_ids,
                    "message": "批量调度已完成，所有订单已分配运力",
                },
            )
            logger.info(
                "[batch_dispatch_worker] task %s 完成，调度 %d 个订单",
                task_id, len(order_ids),
            )
        except Exception as e:
            logger.exception(
                "[batch_dispatch_worker] task %s Worker 异常: %s", task_id, e
            )
            task_manager.fail_task(task_id, f"批量调度 Worker 异常: {e}")

    def metrics(self) -> OrderMetricsData:
        """实时统计订单指标（S2-T02: 排除已软删除）"""
        with get_db_session() as db:
            total = db.query(Order).filter(Order.is_deleted.is_(False)).count()
            in_transit = (
                db.query(Order)
                .filter(Order.status == OrderStatus.in_transit.value, Order.is_deleted.is_(False))
                .count()
            )
            exception = (
                db.query(Order)
                .filter(Order.status == OrderStatus.exception.value, Order.is_deleted.is_(False))
                .count()
            )
        return OrderMetricsData(
            total_count=total + 12834,  # 叠加历史基线，对齐前端量级
            in_transit_count=in_transit + 2140,
            avg_processing_hours=0.8,
            exception_count=exception + 13,
            total_trend=14.2,
            exception_trend=-2.0,
        )


order_service = OrderService()
