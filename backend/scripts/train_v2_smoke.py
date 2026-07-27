"""V2 冒烟测试 / 训练脚本（Phase B）

组装 V2 版本的 Environment、GNN、PPO Agent，在 SQLite 动态图数据上
跑 100 个 Episodes 训练，验证整个训练链路是否能跑通且不崩溃。

测试链路：
    1. 确保数据库已播种（如未播种，自动调用 seed_logistics_net.py）
    2. 加载 V2 环境：LogisticsEnvV2.load_from_db()
    3. 构建 V2 PPO Agent：PPOAgentV2 + bind_env(env)
    4. 训练 100 Episodes：PPOAgentV2.train(env, episodes=100, ...)
    5. 评估寻路决策链路：MultiAgentCoordinatorV2.coordinate_route(env, agent)

输出：
    - 每 10 个 episode 的 reward/loss 趋势
    - 训练前后的对比（reward 是否上升、loss 是否下降）
    - 一次寻路决策链路的实际输出（路径节点、步数、是否兜底）

用法：
    cd backend
    python scripts/train_v2_smoke.py

向后兼容：
    本脚本仅测试 V2 模块，不修改任何 V1 文件，不影响 optimization_service.py。
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path
from typing import List, Tuple

# 把 backend 目录加入 sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))
os.chdir(BACKEND_DIR)

import numpy as np  # noqa: E402

from database import get_db_session  # noqa: E402
from models.logistics_network import LogisticsNode  # noqa: E402


# ====================================================================
# 工具：确保 DB 已播种
# ====================================================================
def ensure_seed_data() -> None:
    """检查 DB 中是否有路网数据，若无则触发种子脚本"""
    with get_db_session() as db:
        node_count = db.query(LogisticsNode).count()
        if node_count == 0:
            print("[Setup] DB 中无路网数据，触发种子脚本...")
            # 直接调用底层函数（main() 使用 argparse 不便传参）
            from scripts.seed_logistics_net import (
                create_tables,
                seed_links,
                seed_nodes,
                seed_scene_factors,
            )
            from database import SessionLocal
            create_tables()
            seed_db = SessionLocal()
            try:
                name_to_id = seed_nodes(seed_db, dry_run=False)
                seed_links(seed_db, name_to_id)
                seed_scene_factors(seed_db, dry_run=False)
                seed_db.commit()
                print("[Setup] 种子数据播种完成")
            except Exception as e:
                seed_db.rollback()
                print(f"[Setup Error] 种子失败: {e}")
                raise
            finally:
                seed_db.close()
        else:
            print(f"[Setup] DB 已有 {node_count} 个节点，跳过播种")


# ====================================================================
# 训练回调：每 N 个 episode 打印一次
# ====================================================================
def make_callback(print_every: int = 10):
    """构造训练回调函数，按间隔打印日志并收集统计"""
    stats: List[Tuple[int, float, float, bool]] = []

    def callback(ep: int, total: int, reward: float, loss: float, logs: List[str]) -> None:
        # 收集统计
        # success 信息从 logs 中提取（不优雅但够用）
        success = "success=True" in logs[-1] if logs else False
        stats.append((ep, reward, loss, success))

        if ep % print_every == 0 or ep == total:
            for line in logs:
                print(f"  {line}")
            print()

    return callback, stats


# ====================================================================
# 趋势分析
# ====================================================================
def analyze_trend(stats: List[Tuple[int, float, float, bool]]) -> None:
    """分析训练趋势：reward 是否上升、loss 是否下降"""
    if len(stats) < 2:
        print("[Trend] 数据不足，无法分析趋势")
        return

    # 取前 10% 和后 10% 的数据对比
    n = len(stats)
    head_size = max(1, n // 10)
    head = stats[:head_size]
    tail = stats[-head_size:]

    head_reward = np.mean([s[1] for s in head])
    tail_reward = np.mean([s[1] for s in tail])
    head_loss = np.mean([s[2] for s in head])
    tail_loss = np.mean([s[2] for s in tail])

    head_success = sum(1 for s in head if s[3]) / len(head)
    tail_success = sum(1 for s in tail if s[3]) / len(tail)

    print("=" * 70)
    print("[趋势分析]")
    print(f"  前 {head_size} episodes 平均: reward={head_reward:.3f}, loss={head_loss:.4f}, "
          f"success_rate={head_success:.1%}")
    print(f"  后 {head_size} episodes 平均: reward={tail_reward:.3f}, loss={tail_loss:.4f}, "
          f"success_rate={tail_success:.1%}")
    print()

    reward_delta = tail_reward - head_reward
    loss_delta = tail_loss - head_loss
    success_delta = tail_success - head_success

    print(f"  Reward 变化: {head_reward:.3f} → {tail_reward:.3f} (Δ={reward_delta:+.3f})")
    print(f"  Loss 变化:   {head_loss:.4f} → {tail_loss:.4f} (Δ={loss_delta:+.4f})")
    print(f"  成功率变化: {head_success:.1%} → {tail_success:.1%} (Δ={success_delta:+.1%})")
    print()

    if reward_delta > 0:
        print(f"  [OK] Reward 上升趋势 (+{reward_delta:.3f})")
    else:
        print(f"  [WARN] Reward 未见上升 ({reward_delta:+.3f})，可能需要更多 episodes 或调参")

    if loss_delta < 0:
        print(f"  [OK] Loss 下降趋势 ({loss_delta:+.4f})")
    else:
        print(f"  [WARN] Loss 未见下降 ({loss_delta:+.4f})，可能需要更多 episodes 或调参")

    if success_delta > 0:
        print(f"  [OK] 成功率提升 (+{success_delta:.1%})")
    print("=" * 70)


# ====================================================================
# 寻路决策链路验证
# ====================================================================
def verify_pathfinding_chain(env, agent) -> None:
    """验证 V2 寻路决策链路：PPO 探索 + Dijkstra 兜底"""
    from agent.multi_agent_v2 import MultiAgentCoordinatorV2

    print("\n" + "=" * 70)
    print("[寻路决策链路验证]")
    print("=" * 70)

    coordinator = MultiAgentCoordinatorV2()

    # 测试用例：(start_code, end_code, weights, 描述)
    test_cases = [
        ("shenzhen", "hamburg", (0.25, 0.25, 0.25, 0.25), "均衡权重（深圳→汉堡）"),
        ("beijing", "los_angeles", (0.4, 0.3, 0.2, 0.1), "成本优先（北京→洛杉矶）"),
        ("shanghai", "london", (0.1, 0.5, 0.1, 0.3), "时效优先（上海→伦敦）"),
    ]

    for start_code, end_code, weights, desc in test_cases:
        print(f"\n[Case] {desc}")
        print(f"  起点: {start_code}, 终点: {end_code}")
        print(f"  权重: cost={weights[0]}, time={weights[1]}, "
              f"carbon={weights[2]}, risk={weights[3]}")

        result = coordinator.coordinate_route(
            env=env,
            start_code=start_code,
            end_code=end_code,
            weights=weights,
            agent=agent,
            deterministic=True,  # 部署模式：贪心选择
        )

        print(f"  结果: success={result['success']}")
        print(f"  路径节点: {' → '.join(result['route_nodes'])}")
        print(f"  运输方式: {result['transport_modes']}")
        print(f"  总成本: ${result['total_cost']:.0f}")
        print(f"  总时效: {result['total_time']:.1f} 天")
        print(f"  总碳排: {result['total_carbon']:.0f} kg")
        print(f"  总风险: {result['total_risk']:.2f}")
        print(f"  PPO 步数: {result['ppo_steps']}, "
              f"Dijkstra 步数: {result['dijkstra_steps']}, "
              f"兜底原因: {result['fallback_reason']}")


# ====================================================================
# 主流程
# ====================================================================
def main() -> int:
    print("=" * 70)
    print("Phase B V2 冒烟测试 / 训练脚本")
    print("=" * 70)
    print()

    # 1. 检查 PyTorch
    try:
        import torch
        print(f"[Setup] PyTorch 版本: {torch.__version__}")
    except ImportError:
        print("[Error] PyTorch 未安装，请运行: pip install torch")
        return 1

    # 2. 确保 DB 已播种
    ensure_seed_data()
    print()

    # 3. 加载 V2 环境
    print("[Step 1] 加载 V2 环境 (LogisticsEnvV2)...")
    from agent.environment_v2 import LogisticsEnvV2
    env = LogisticsEnvV2(scene="normal")
    env.load_from_db()
    print(f"  节点数: {env.num_nodes}, 链路数: {env.num_links}")
    print()

    # 4. 构建 V2 PPO Agent 并绑定环境
    print("[Step 2] 构建 PPOAgentV2 并绑定环境...")
    from agent.ppo_agent_v2 import PPOAgentV2
    agent = PPOAgentV2(
        hidden_dim=64,
        lr=1e-3,
        gamma=0.99,
        gae_lambda=0.95,
        clip_epsilon=0.2,
        entropy_coef=0.01,
        value_loss_coef=0.5,
        batch_size=64,
        epochs=4,
    )
    agent.bind_env(env)
    print()

    # 5. 训练 100 个 Episodes
    episodes = 100
    print(f"[Step 3] 开始训练 {episodes} 个 Episodes...")
    print("-" * 70)

    weights = (0.25, 0.25, 0.25, 0.25)  # 均衡权重
    start_code = "shenzhen"
    end_code = "hamburg"

    callback, stats = make_callback(print_every=10)
    t0 = time.time()
    train_result = agent.train(
        env=env,
        episodes=episodes,
        weights=weights,
        start_code=start_code,
        end_code=end_code,
        callback=callback,
    )
    elapsed = time.time() - t0

    print("-" * 70)
    print(f"[Step 3] 训练完成，耗时 {elapsed:.1f}s")
    print(f"  实际运行 episodes: {train_result['episodes_run']}")
    print(f"  最终 reward: {train_result['final_reward']:.3f}")
    print(f"  最终 loss: {train_result['final_loss']:.4f}")
    print()

    # 6. 趋势分析
    analyze_trend(stats)

    # 7. 验证寻路决策链路
    print()
    verify_pathfinding_chain(env, agent)

    # 8. 保存模型（可选）
    try:
        save_path = "agent/saved_models/ppo_v2_smoke.pt"
        agent.save(save_path)
        print(f"\n[Save] V2 模型已保存到: {save_path}")
    except Exception as e:
        print(f"\n[WARN] 模型保存失败: {e}")

    print("\n" + "=" * 70)
    print("[完成] V2 冒烟测试通过，整个训练链路工作正常")
    print("=" * 70)
    return 0


if __name__ == "__main__":
    sys.exit(main())
