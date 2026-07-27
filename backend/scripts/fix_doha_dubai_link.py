"""Phase F 修复脚本：新增 doha ↔ dubai 短距离空运链路

修复问题：
    多哈（doha）和迪拜（dubai）地理上仅相距 ~400km（同在波斯湾南岸），
    但图结构中没有直接连接。导致 PPO 走到 doha 后无法直接到 dubai，
    必须绕道 hamburg（后退 4503km），产生地理上荒谬的折返路径。

修复策略：
    新增 doha↔dubai 空运短程链路（双向），成本 $800，时效 0.3 天。

用法：
    cd backend
    python scripts/fix_doha_dubai_link.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from sqlalchemy.orm import Session  # noqa: E402

from database import SessionLocal  # noqa: E402
from models.logistics_network import LogisticsLink, LogisticsNode  # noqa: E402


def upsert_link(db: Session, from_id: int, to_id: int, mode: str,
                cost: float, time: float, carbon: float, risk: float) -> str:
    """单条链路 upsert"""
    existing = (
        db.query(LogisticsLink)
        .filter_by(from_node_id=from_id, to_node_id=to_id, transport_mode=mode)
        .first()
    )
    if existing:
        existing.base_cost_usd = cost
        existing.base_time_days = time
        existing.base_carbon_kg = carbon
        existing.base_risk = risk
        existing.is_active = True
        return "UPDATE"
    else:
        link = LogisticsLink(
            from_node_id=from_id, to_node_id=to_id,
            transport_mode=mode,
            base_cost_usd=cost, base_time_days=time,
            base_carbon_kg=carbon, base_risk=risk,
            is_active=True,
        )
        db.add(link)
        db.flush()
        return "INSERT"


def main() -> None:
    db: Session = SessionLocal()
    try:
        doha = db.query(LogisticsNode).filter_by(code="doha").first()
        dubai = db.query(LogisticsNode).filter_by(code="dubai").first()

        if not doha:
            print("[ERROR] 未找到 doha 节点")
            return
        if not dubai:
            print("[ERROR] 未找到 dubai 节点")
            return

        print(f"[INFO] doha.id={doha.id}, dubai.id={dubai.id}")

        # 新增 doha → dubai 链路
        action1 = upsert_link(db, doha.id, dubai.id, "air", 800.0, 0.3, 560.0, 0.03)
        print(f"  [{action1}] doha → dubai [air] cost=800 time=0.3")

        # 新增 dubai → doha 链路（反向）
        action2 = upsert_link(db, dubai.id, doha.id, "air", 800.0, 0.3, 560.0, 0.03)
        print(f"  [{action2}] dubai → doha [air] cost=800 time=0.3")

        db.commit()
        print(f"\n[OK] doha ↔ dubai 链路已确保存在")

        # 验证
        print("\n========== 验证 ==========")
        links = (
            db.query(LogisticsLink)
            .filter(
                LogisticsLink.from_node_id.in_([doha.id, dubai.id]),
                LogisticsLink.to_node_id.in_([doha.id, dubai.id]),
                LogisticsLink.from_node_id != LogisticsLink.to_node_id,
            )
            .all()
        )
        for link in links:
            from_node = db.query(LogisticsNode).filter_by(id=link.from_node_id).first()
            to_node = db.query(LogisticsNode).filter_by(id=link.to_node_id).first()
            print(
                f"  {from_node.code} → {to_node.code} [{link.transport_mode}] "
                f"cost={link.base_cost_usd} time={link.base_time_days}"
            )

    except Exception as e:
        db.rollback()
        print(f"[ERROR] 修复失败: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
