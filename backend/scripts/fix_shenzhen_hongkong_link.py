"""Phase F 修复脚本：将深圳↔香港的 air/sea 链路改为 land，并删除 air 链路

修复问题：
    1. 深圳到香港实际距离 ~30km，不可能用空运（air）
    2. 也不应该用海运（sea），应该用陆运（land）卡车短驳
    3. 同步更新 DB 中的链路数据

修复策略：
    先删除 shenzhen↔hong_kong 的所有链路（air/sea/land），
    再 INSERT 新的 land 链路（双向），避免 UNIQUE 冲突。

用法：
    cd backend
    python scripts/fix_shenzhen_hongkong_link.py
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

# 把 backend 目录加入 sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

from sqlalchemy.orm import Session  # noqa: E402

from database import SessionLocal  # noqa: E402
from models.logistics_network import LogisticsLink, LogisticsNode  # noqa: E402


def main() -> None:
    db: Session = SessionLocal()
    try:
        # 找到 shenzhen 和 hong_kong 节点
        shenzhen = db.query(LogisticsNode).filter_by(code="shenzhen").first()
        hong_kong = db.query(LogisticsNode).filter_by(code="hong_kong").first()

        if not shenzhen:
            print("[ERROR] 未找到 shenzhen 节点")
            return
        if not hong_kong:
            print("[ERROR] 未找到 hong_kong 节点")
            return

        print(f"[INFO] shenzhen.id={shenzhen.id}, hong_kong.id={hong_kong.id}")

        # 1. 删除 shenzhen ↔ hong_kong 的所有链路（air/sea/land，双向）
        deleted = 0
        for from_id, to_id in [
            (shenzhen.id, hong_kong.id),
            (hong_kong.id, shenzhen.id),
        ]:
            links = (
                db.query(LogisticsLink)
                .filter_by(from_node_id=from_id, to_node_id=to_id)
                .all()
            )
            for link in links:
                print(
                    f"  [DELETE] {from_id} -> {to_id} [{link.transport_mode}] "
                    f"(cost={link.base_cost_usd})"
                )
                db.delete(link)
                deleted += 1

        # 立即 flush，让删除生效
        db.flush()

        # 2. INSERT 新的 land 链路（双向）
        new_link_forward = LogisticsLink(
            from_node_id=shenzhen.id,
            to_node_id=hong_kong.id,
            transport_mode="land",
            base_cost_usd=200.0,
            base_time_days=0.3,
            base_carbon_kg=280.0,
            base_risk=0.03,
            is_active=True,
        )
        db.add(new_link_forward)
        print("  [INSERT] shenzhen → hong_kong land 链路 (cost=200, time=0.3)")

        new_link_reverse = LogisticsLink(
            from_node_id=hong_kong.id,
            to_node_id=shenzhen.id,
            transport_mode="land",
            base_cost_usd=200.0,
            base_time_days=0.3,
            base_carbon_kg=280.0,
            base_risk=0.03,
            is_active=True,
        )
        db.add(new_link_reverse)
        print("  [INSERT] hong_kong → shenzhen land 链路 (cost=200, time=0.3)")

        db.commit()
        print(f"\n[OK] 修复完成：删除 {deleted} 条旧链路，新增 2 条 land 链路")

        # 验证
        print("\n========== 验证 ==========")
        all_links = (
            db.query(LogisticsLink)
            .filter(
                LogisticsLink.from_node_id.in_([shenzhen.id, hong_kong.id]),
                LogisticsLink.to_node_id.in_([shenzhen.id, hong_kong.id]),
            )
            .all()
        )
        for link in all_links:
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
