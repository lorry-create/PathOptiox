"""数据库初始化工具

职责：
1. 空库时自动插入示例数据，保证首次启动页面效果与内存版完全一致
2. 启动时校验表结构是否就绪（未执行迁移时给出友好提示）

⚠️ 重要：本模块不再负责建表！表结构由 Alembic 迁移统一管理：
    alembic upgrade head
删除了原 Base.metadata.create_all() 兜底逻辑，避免与 Alembic 产生 schema 漂移。

示例数据来源：原内存版 service 的 _seed 函数，包含：
- 8 条订单（CN77218841 ~ CN77218848）
- 5 条预警（alert_001 ~ alert_005）
- 3 条训练历史（M20260628A / M20260620B / M20260610C）
- 1 个默认管理员账号（lorry / 123456）

S2-T03: 日期字段统一为 DATE/DATETIME 类型，seed 时字符串需转为 date/datetime 对象。
调用时机：main.py 启动时执行 init_db() 一次。
"""
import logging
from datetime import date, datetime
from typing import List

from sqlalchemy import inspect

from database import engine, SessionLocal
from models.order import Order
from models.alert import Alert, AlertOrderRel
from models.training_history import TrainingHistory
from models.user import User
from models.system_config import SystemConfig
from models.knowledge_base import KnowledgeBaseEntry
from services.auth_service import hash_password

logger = logging.getLogger(__name__)


# ===== 示例订单数据（与原 order_service._seed_orders 完全一致）=====
SEED_ORDERS: List[dict] = [
    {
        "order_no": "CN77218841",
        "customer_name": "智联电子制造",
        "date": "2026-07-01",
        "total_amount": 28450.50,
        "status": "in_transit",
        "sender": "智联电子制造 (深圳)",
        "receiver": "环球商贸 (上海)",
        "goods_description": "工业级精密传感器 x12",
        "shipping_method": "land",
        "estimated_delivery": "2026-07-08",
    },
    {
        "order_no": "CN77218842",
        "customer_name": "远洋物流集团",
        "date": "2026-07-02",
        "total_amount": 156800.00,
        "status": "pending",
        "sender": "远洋物流 (宁波)",
        "receiver": "汉堡贸易 (德国)",
        "goods_description": "自动化设备组件 x30",
        "shipping_method": "sea",
        "estimated_delivery": "2026-08-05",
    },
    {
        "order_no": "CN77218843",
        "customer_name": "速达供应链",
        "date": "2026-07-03",
        "total_amount": 8920.00,
        "status": "delivered",
        "sender": "速达供应链 (广州)",
        "receiver": "北美分拨中心 (洛杉矶)",
        "goods_description": "电子配件 x200",
        "shipping_method": "air",
        "estimated_delivery": "2026-07-06",
    },
    {
        "order_no": "CN77218844",
        "customer_name": "环宇精密仪器",
        "date": "2026-07-03",
        "total_amount": 95600.00,
        "status": "exception",
        "sender": "环宇精密 (苏州)",
        "receiver": "中东贸易 (迪拜)",
        "goods_description": "精密光学仪器 x8",
        "shipping_method": "air",
        "estimated_delivery": "2026-07-10",
    },
    {
        "order_no": "CN77218845",
        "customer_name": "宏盛国际贸易",
        "date": "2026-07-04",
        "total_amount": 42300.75,
        "status": "in_transit",
        "sender": "宏盛国际 (天津)",
        "receiver": "欧洲分拨 (鹿特丹)",
        "goods_description": "机械零部件 x55",
        "shipping_method": "rail",
        "estimated_delivery": "2026-07-22",
    },
    {
        "order_no": "CN77218846",
        "customer_name": "锦程货运代理",
        "date": "2026-07-04",
        "total_amount": 18750.00,
        "status": "pending",
        "sender": "锦程货运 (青岛)",
        "receiver": "东南亚分拨 (新加坡)",
        "goods_description": "纺织原料 x120",
        "shipping_method": "sea",
        "estimated_delivery": "2026-07-20",
    },
    {
        "order_no": "CN77218847",
        "customer_name": "创新科技股份",
        "date": "2026-07-05",
        "total_amount": 211400.00,
        "status": "delivered",
        "sender": "创新科技 (杭州)",
        "receiver": "北美总部 (纽约)",
        "goods_description": "服务器整机 x15",
        "shipping_method": "air",
        "estimated_delivery": "2026-07-08",
    },
    {
        "order_no": "CN77218848",
        "customer_name": "东方航运有限",
        "date": "2026-07-05",
        "total_amount": 67800.00,
        "status": "in_transit",
        "sender": "东方航运 (大连)",
        "receiver": "欧洲贸易 (汉堡)",
        "goods_description": "化工原料 x40",
        "shipping_method": "sea",
        "estimated_delivery": "2026-08-10",
    },
]


# ===== 示例预警数据（与原 alert_service._seed_alerts 完全一致）=====
SEED_ALERTS: List[dict] = [
    {
        "alert_no": "alert_001",
        "level": "high",
        "title": "苏伊士运河通行受限",
        "content": "苏伊士运河近期通行效率下降 35%，预计影响 12 条航线准时率",
        "time": "2026-07-05 14:30",
        "affected_route": "singapore → rotterdam",
        "affected_orders": ["CN77218845", "CN77218848"],
        "daily_loss": 28500,
        "ai_suggestion": "建议启用非洲好望角备用航线，预计增加 8 天运输时间但可降低风险敞口",
        "handled": False,
    },
    {
        "alert_no": "alert_002",
        "level": "critical",
        "title": "港口拥堵红色预警",
        "content": "上海港当前拥堵船舶达 48 艘，平均等待时间 6.2 天",
        "time": "2026-07-05 10:15",
        "affected_route": "shanghai → singapore",
        "affected_orders": ["CN77218842", "CN77218846"],
        "daily_loss": 42000,
        "ai_suggestion": "建议分流至宁波港，可减少 4 天等待时间，成本增加约 8%",
        "handled": False,
    },
    {
        "alert_no": "alert_003",
        "level": "moderate",
        "title": "燃油价格波动",
        "content": "国际航空燃油价格周环比上涨 12%，空运成本承压",
        "time": "2026-07-04 16:00",
        "affected_route": "shenzhen → frankfurt",
        "affected_orders": ["CN77218844"],
        "daily_loss": 8500,
        "ai_suggestion": "建议对时效要求不高的订单转用海铁联运方案",
        "handled": True,
    },
    {
        "alert_no": "alert_004",
        "level": "low",
        "title": "区域天气预警",
        "content": "南海区域未来 3 天有 8 级大风，海运可能延迟 1-2 天",
        "time": "2026-07-04 09:20",
        "affected_route": "shenzhen → singapore",
        "affected_orders": ["CN77218841"],
        "daily_loss": 0,
        "ai_suggestion": "建议维持原航线，已预留 2 天缓冲期可覆盖延迟风险",
        "handled": False,
    },
    {
        "alert_no": "alert_005",
        "level": "high",
        "title": "海关政策调整",
        "content": "欧盟新海关申报政策将于 7 月 15 日生效，需更新申报流程",
        "time": "2026-07-03 11:45",
        "affected_route": "singapore → hamburg",
        "affected_orders": ["CN77218848"],
        "daily_loss": 15600,
        "ai_suggestion": "建议提前完成合规文档更新，启用陆运通关模式降低清关延迟",
        "handled": False,
    },
]


# ===== 示例训练历史（与原 training_service._seed_history 完全一致）=====
# S2-T03: created_at_str 改为 created_at（DateTime），seed 时转为 datetime 对象
SEED_TRAINING_HISTORY: List[dict] = [
    {
        "model_id": "M20260628A",
        "version_name": "v2.3.1-cost-opt",
        "created_at": "2026-06-28 14:20",
        "reward": 182.5,
        "status": "archived",
    },
    {
        "model_id": "M20260620B",
        "version_name": "v2.3.0-robust",
        "created_at": "2026-06-20 09:15",
        "reward": 168.2,
        "status": "archived",
    },
    {
        "model_id": "M20260610C",
        "version_name": "v2.2.9-green",
        "created_at": "2026-06-10 16:40",
        "reward": 154.8,
        "status": "archived",
    },
]


# ===== 默认管理员账号 =====
# password 为明文，仅在 seed 时通过 hash_password 转为哈希值写入 hashed_password 字段
DEFAULT_ADMIN = {
    "username": "lorry",
    "password": "123456",
    "email": "lorry@example.com",
    "full_name": "Lorry Driver",
    "is_admin": True,
}


def _check_tables_ready() -> bool:
    """检查所有业务表是否已通过 Alembic 迁移创建

    Returns:
        True  - 所有表就绪，可继续 seed
        False - 表缺失，需先执行 `alembic upgrade head`
    """
    required_tables = {
        Order.__tablename__,
        Alert.__tablename__,
        AlertOrderRel.__tablename__,  # S2-T01: 中间表
        TrainingHistory.__tablename__,
        User.__tablename__,
        SystemConfig.__tablename__,
        KnowledgeBaseEntry.__tablename__,  # S3-T03: RAG 知识库
    }
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    missing = required_tables - existing_tables
    if missing:
        logger.warning(
            "检测到缺失表 %s，请先执行 `alembic upgrade head` 完成数据库迁移后再启动应用。",
            ", ".join(sorted(missing)),
        )
        return False
    return True


def _seed_orders(db) -> None:
    """插入示例订单（仅当订单表为空时）

    S2-T03: date 字段从 "YYYY-MM-DD" 字符串转为 date 对象存入 DATE 列。
    """
    if db.query(Order).count() > 0:
        return
    for item in SEED_ORDERS:
        item = dict(item)
        # 字符串 → date 对象
        if isinstance(item.get("date"), str):
            item["date"] = date.fromisoformat(item["date"])
        db.add(Order(**item))


def _seed_alerts(db) -> None:
    """插入示例预警（仅当预警表为空时）

    S2-T01: affected_orders 改用 alert_order_rel 中间表存储，
    Alert 表不再有 affected_orders JSON 列。
    S2-T03: time 字段从 "YYYY-MM-DD HH:mm" 字符串转为 datetime 对象存入 DATETIME 列。
    """
    if db.query(Alert).count() > 0:
        return
    for item in SEED_ALERTS:
        # S2-T01: 复制字典避免污染 SEED_ALERTS 原始数据
        item = dict(item)
        # 从 alert 字典中弹出 affected_orders 列表，改用中间表存储
        affected_order_nos = item.pop("affected_orders", [])
        # S2-T03: time 字符串 → datetime 对象
        if isinstance(item.get("time"), str):
            try:
                item["time"] = datetime.strptime(item["time"], "%Y-%m-%d %H:%M")
            except ValueError:
                pass  # 解析失败保留原值，让 SQLAlchemy 处理
        alert = Alert(**item)
        db.add(alert)
        db.flush()  # 获取 alert.id
        # 通过 order_no 查找 order_id 并插入关联表
        for order_no in affected_order_nos:
            order = db.query(Order).filter(Order.order_no == order_no).first()
            if order:
                db.add(AlertOrderRel(alert_id=alert.id, order_id=order.id))


def _seed_training_history(db) -> None:
    """插入示例训练历史（仅当训练历史表为空时）

    S2-T03: created_at 字段从 "YYYY-MM-DD HH:mm" 字符串转为 datetime 对象存入 DATETIME 列。
    """
    if db.query(TrainingHistory).count() > 0:
        return
    for item in SEED_TRAINING_HISTORY:
        item = dict(item)
        # 字符串 → datetime 对象
        if isinstance(item.get("created_at"), str):
            try:
                item["created_at"] = datetime.strptime(item["created_at"], "%Y-%m-%d %H:%M")
            except ValueError:
                pass  # 解析失败不设置，由 BaseModel 默认值填充
        db.add(TrainingHistory(**item))


def _seed_default_admin(db) -> None:
    """插入默认管理员账号（仅当用户表为空时）

    将明文密码通过 bcrypt 哈希后写入 hashed_password 字段，
    数据库中不存储任何明文密码。
    """
    if db.query(User).count() > 0:
        return
    admin = {**DEFAULT_ADMIN}
    # 弹出明文密码，转为哈希值写入 hashed_password
    plain_password = admin.pop("password")
    admin["hashed_password"] = hash_password(plain_password)
    db.add(User(**admin))


# ===== RAG 知识库种子数据（S3-T03）=====
SEED_KB_ENTRIES = [
    {
        "title": "国际运输方式对比",
        "category": "transport_mode",
        "content": (
            "海运：成本最低（0.05-0.15 USD/kg），时效最慢（15-40 天），"
            "适合大宗低值货物；空运：成本最高（3-8 USD/kg），时效最快（1-5 天），"
            "适合高价值或紧急货物；铁路：中欧班列 12-18 天，成本介于海空之间；"
            "公路：区域内灵活，时效 1-7 天。多式联运可平衡成本与时效。"
        ),
    },
    {
        "title": "主要港口拥堵指数",
        "category": "port_congestion",
        "content": (
            "上海港、宁波港拥堵指数 65-85（中度拥堵），平均等待 1-3 天；"
            "洛杉矶港、长滩港高峰期拥堵指数 90+，等待 5-10 天；"
            "新加坡港、鹿特丹港效率较高，拥堵指数 30-50，等待 0.5-1 天。"
            "建议高峰期避开美西港口，优先选择加拿大或东海岸港口。"
        ),
    },
    {
        "title": "海关清关时效与要求",
        "category": "customs",
        "content": (
            "中国出口清关 1-2 天，美国进口清关 2-5 天，欧盟 2-4 天。"
            "需提供：商业发票、装箱单、提单、原产地证、HS 编码。"
            "危险品需 MSDS 与危险品申报单；食品需卫生证书。"
            "低价值货物（<800 USD）入境美国可享 321 条款免税清关。"
        ),
    },
    {
        "title": "碳排放因子参考表",
        "category": "carbon",
        "content": (
            "空运碳排放因子 0.602 kgCO2/ton-km（最高）；"
            "公路 0.062-0.150；铁路 0.022；海运 0.011-0.040（最低）。"
            "ESEA 碳税：欧盟碳边境调节机制（CBAM）2026 年全面实施，"
            "海运纳入 EU ETS，每吨 CO2 约 80-100 EUR。"
            "建议高碳排货物（空运/长途公路）优先评估绿色替代方案。"
        ),
    },
    {
        "title": "危险品分类与运输限制",
        "category": "dangerous_goods",
        "content": (
            "IMO 危险品分 9 类：1 爆炸品、2 气体、3 易燃液体、4 易燃固体、"
            "5 氧化剂、6 毒性品、7 放射性、8 腐蚀性、9 杂项。"
            "空运限制最严，锂电池（Class 9）需 UN38.3 测试报告；"
            "海运可接大部分危险品但需隔离装载。港口危险品作业需提前 24h 申报。"
        ),
    },
    {
        "title": "主要运河通行状态",
        "category": "canal",
        "content": (
            "苏伊士运河：通行费 30-50 万 USD/船，等待 1-3 天，"
            "2024 年红海危机后部分航线绕行好望角，时效增加 7-10 天；"
            "巴拿马运河：通行费 15-30 万 USD/船，2023-2024 干旱限行，"
            "每日船位降至 22 艘（常态 36），等待 3-7 天。"
            "建议提前预约船位或选择替代路线。"
        ),
    },
    {
        "title": "Incoterms 2020 国际贸易术语",
        "category": "incoterms",
        "content": (
            "EXW：卖方仅交货至工厂，买方承担全部运输与风险；"
            "FOB：卖方负责至装运港船上，海运常用；"
            "CIF：卖方承担运费保险至目的港，含保险；"
            "DAP：卖方交货至指定目的地，买方清关；"
            "DDP：卖方承担全部费用含进口清关与税费（卖方责任最大）。"
            "建议根据货权控制需求与清关能力选择术语。"
        ),
    },
    {
        "title": "订单物流状态追踪",
        "category": "order_tracking",
        "content": (
            "订单状态流转：已下单 → 已揽收 → 干线运输 → 报关出口 → "
            "国际运输 → 报关进口 → 末端派送 → 签收。"
            "异常状态：滞港超 3 天、清关查验、运输破损、地址错误。"
            "可提供 4PL 可视化追踪，关键节点自动推送。"
            "订单号格式：CN + 8 位数字（如 CN77218841）。"
        ),
    },
]


def _seed_knowledge_base(db) -> None:
    """插入 RAG 知识库种子数据（仅当知识库为空时）

    S3-T03: 向量 RAG 知识库初始化，供智能客服检索使用。
    """
    if db.query(KnowledgeBaseEntry).filter(KnowledgeBaseEntry.is_deleted.is_(False)).count() > 0:  # noqa: E712
        return
    for item in SEED_KB_ENTRIES:
        db.add(KnowledgeBaseEntry(**item))


def init_db() -> None:
    """初始化数据库：空库时插入示例数据

    ⚠️ 表结构由 Alembic 管理，本函数不再调用 create_all。
    若未执行迁移，将跳过 seed 并打印警告，避免抛异常阻断启动。

    调用时机：main.py 启动时执行一次。
    幂等安全：重复调用不会产生重复数据。
    """
    if not _check_tables_ready():
        return

    db = SessionLocal()
    try:
        _seed_orders(db)
        _seed_alerts(db)
        _seed_training_history(db)
        _seed_default_admin(db)
        _seed_knowledge_base(db)
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    # S2-T06: seed 默认系统配置项（独立 session，仅插入缺失的键）
    from services.system_config_service import system_config_service
    system_config_service.seed_defaults()


if __name__ == "__main__":
    # 直接运行此脚本可手动初始化示例数据（需先执行 alembic upgrade head）
    init_db()
    print("数据库示例数据初始化完成")
