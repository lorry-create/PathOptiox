"""PPO Agent V2（Phase B + Phase C 修复：GNN + 动态动作空间 + 权重感知）

将 Phase A 的 `GraphFeatureExtractor` 作为 PPO Actor-Critic 网络的前置特征提取层，
**彻底解耦 action_dim 与实际节点数量的绑定**。

核心改造：
    1. GNN 前端：用 GraphFeatureExtractor 编码整个路网，输出固定维度节点嵌入
    2. 动态动作空间：Actor 输出维度 = 当前节点可行动作数（不再是固定 48 维）
    3. 完整 PPO 训练循环：GAE + 裁剪目标 + 熵正则化
    4. 权重感知（Phase C 修复）：Actor/Critic 输入拼接 4 维 weights 向量
       - Actor 输入: [curr_emb + neighbor_emb + link_feat + weights]
       - Critic 输入: [curr_emb + weights]
       - 让 PPO 能根据当前偏好做出不同决策，解决路径同质化问题

向后兼容：
    本模块独立存在，不修改 V1 `ppo_agent.py`。
"""
from __future__ import annotations

import logging
import os
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from .environment_v2 import LogisticsEnvV2

logger = logging.getLogger(__name__)

# ====================================================================
# PyTorch 依赖检测
# ====================================================================
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.distributions import Categorical
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    torch = None  # type: ignore
    nn = None  # type: ignore
    F = None  # type: ignore
    logger.warning("PyTorch 未安装，PPOAgentV2 不可用")


TrainCallback = Callable[[int, int, float, float, List[str]], None]

# 权重向量维度（Phase C 修复：状态感知）
WEIGHTS_DIM = 4


if HAS_TORCH:

    class PPOAgentV2:
        """PPO Agent V2（GNN + 动态动作空间 + 权重感知）

        Phase C 修复：Actor/Critic 输入拼接 weights，让 PPO 感知当前偏好

        用法：
            agent = PPOAgentV2(hidden_dim=64, lr=1e-3)
            agent.bind_env(env)  # 预计算节点特征矩阵
            state = env.reset("shenzhen", "hamburg", weights)
            for step in range(50):
                action, log_prob, value = agent.act(state, env)
                next_state, reward, done, info = env.step(action)
                ...
        """

        def __init__(
            self,
            hidden_dim: int = 64,
            lr: float = 1e-3,
            gamma: float = 0.99,
            gae_lambda: float = 0.95,
            clip_epsilon: float = 0.2,
            entropy_coef: float = 0.05,  # Phase D: 0.01 → 0.05（提高探索率）
            value_loss_coef: float = 0.5,
            batch_size: int = 64,
            epochs: int = 4,
        ) -> None:
            self.hidden_dim = hidden_dim
            self.lr = lr
            self.gamma = gamma
            self.gae_lambda = gae_lambda
            self.clip_epsilon = clip_epsilon
            self.entropy_coef = entropy_coef
            self.value_loss_coef = value_loss_coef
            self.batch_size = batch_size
            self.epochs = epochs

            self.device = torch.device("cpu")

            # Phase D 炼丹调优：epsilon-greedy 探索参数
            # 训练前 explore_episodes 轮，以 epsilon 概率随机选择动作
            # 强迫 AI 探索那些跳数多但极其便宜的海运节点（苏伊士、科伦坡）
            # Phase D 修复：探索期 2500 → 1500，给 PPO 留更多纯学习时间
            # 3000 轮训练：1500 探索 + 1500 纯 PPO 学习
            self.epsilon = 0.5                # 探索概率（提高初始探索强度）
            self.epsilon_min = 0.05           # 最小探索概率
            self.epsilon_decay = 0.997        # 衰减速率（放缓衰减，让探索期更长）
            self.explore_episodes = 1500      # 前 1500 轮启用 epsilon-greedy
            self._current_episode = 0         # 当前训练轮数（train() 内更新）

            # 延迟初始化网络（bind_env 后才知道 node_feat_dim）
            self._gnn_extractor = None
            self._actor_head = None
            self._critic_head = None
            self._optimizer = None

            # 缓存的图特征（bind_env 后填充）
            self._node_features: Optional[torch.Tensor] = None
            self._edge_index: Optional[torch.Tensor] = None
            self._edge_attr: Optional[torch.Tensor] = None
            self._link_features: Optional[torch.Tensor] = None  # [E, edge_feat_dim]
            self._env_links = None  # 缓存 env.links 引用，便于训练回放

        # ====================================================================
        # 环境绑定：预计算图特征
        # ====================================================================
        def bind_env(self, env: LogisticsEnvV2) -> None:
            """绑定环境，预计算节点/链路特征矩阵

            必须在训练/推理前调用一次。
            若环境路网变化（节点/链路增删），需重新调用。
            """
            from .gnn_extractor import (
                LINK_FEAT_DIM,
                NODE_FEAT_DIM,
                build_node_features,
                GraphFeatureExtractor,
            )
            from .gnn_extractor import LINK_MODES, _one_hot

            # 1. 构造节点特征矩阵 [N, NODE_FEAT_DIM]
            node_feats_np = build_node_features(env.nodes)
            self._node_features = torch.as_tensor(
                node_feats_np, dtype=torch.float32, device=self.device
            )

            # 2. 构造边索引 [2, E]
            src = [link.from_idx for link in env.links]
            dst = [link.to_idx for link in env.links]
            edge_index_np = np.array([src, dst], dtype=np.int64)
            self._edge_index = torch.as_tensor(
                edge_index_np, dtype=torch.long, device=self.device
            )

            # 3. 构造链路特征矩阵 [E, LINK_FEAT_DIM]
            link_feats_list = []
            for link in env.links:
                mode_oh = _one_hot(link.mode, LINK_MODES)
                numeric = [
                    float(link.cost_usd) / 25000.0,
                    float(link.time_days) / 25.0,
                    float(link.carbon_kg) / 25000.0,
                    float(link.base_risk),
                    0.0,  # distance_km 未知，占位
                ]
                link_feats_list.append(mode_oh + numeric)
            link_feats_np = np.array(link_feats_list, dtype=np.float32)
            self._edge_attr = torch.as_tensor(
                link_feats_np, dtype=torch.float32, device=self.device
            )
            self._link_features = self._edge_attr  # 别名

            # 4. 缓存 env.links 引用，训练回放时使用
            self._env_links = env.links

            # 5. 初始化 GNN 特征提取器
            if self._gnn_extractor is None:
                self._gnn_extractor = GraphFeatureExtractor(
                    node_feat_dim=NODE_FEAT_DIM,
                    edge_feat_dim=LINK_FEAT_DIM,
                    hidden_dim=self.hidden_dim,
                    num_heads=4,
                    num_layers=2,
                    dropout=0.1,
                ).to(self.device)

                # Phase C 修复：Actor head 输入拼接 weights
                # 输入 = [curr_emb(64) + neighbor_emb(64) + link_feat(9) + weights(4)] = 141
                actor_in_dim = self.hidden_dim * 2 + LINK_FEAT_DIM + WEIGHTS_DIM
                self._actor_head = nn.Sequential(
                    nn.Linear(actor_in_dim, self.hidden_dim),
                    nn.ReLU(),
                    nn.Linear(self.hidden_dim, 1),
                ).to(self.device)

                # Phase C 修复：Critic head 输入拼接 weights
                # 输入 = [curr_emb(64) + weights(4)] = 68
                critic_in_dim = self.hidden_dim + WEIGHTS_DIM
                self._critic_head = nn.Sequential(
                    nn.Linear(critic_in_dim, self.hidden_dim),
                    nn.ReLU(),
                    nn.Linear(self.hidden_dim, 1),
                ).to(self.device)

                # 优化器
                self._optimizer = torch.optim.Adam(
                    list(self._gnn_extractor.parameters())
                    + list(self._actor_head.parameters())
                    + list(self._critic_head.parameters()),
                    lr=self.lr,
                )

                logger.info(
                    f"PPOAgentV2 绑定环境: {len(env.nodes)} 节点, {len(env.links)} 链路, "
                    f"hidden={self.hidden_dim}, params={self._count_params()}, "
                    f"weights_aware=True"
                )

        def _count_params(self) -> int:
            """统计可训练参数数"""
            if self._gnn_extractor is None:
                return 0
            return (
                sum(p.numel() for p in self._gnn_extractor.parameters())
                + sum(p.numel() for p in self._actor_head.parameters())
                + sum(p.numel() for p in self._critic_head.parameters())
            )

        def _all_params(self):
            """返回所有可训练参数的迭代器"""
            return (
                list(self._gnn_extractor.parameters())
                + list(self._actor_head.parameters())
                + list(self._critic_head.parameters())
            )

        def _has_nan_weights(self) -> bool:
            """Phase D 修复：检测模型权重是否已变为 NaN/Inf

            一旦权重变 NaN，所有后续前向/反向都会是 NaN，模型永远无法自愈。
            必须主动检测并恢复。
            """
            if self._gnn_extractor is None:
                return False
            for p in self._all_params():
                if torch.isnan(p).any() or torch.isinf(p).any():
                    return True
            return False

        def _reinit_weights(self) -> None:
            """Phase D 修复：权重变 NaN 后重新初始化网络"""
            logger.warning("检测到 NaN 权重，重新初始化网络参数")
            for module in [self._gnn_extractor, self._actor_head, self._critic_head]:
                for p in module.parameters():
                    if p.dim() >= 2:
                        nn.init.xavier_uniform_(p)
                    elif p.dim() == 1:
                        nn.init.zeros_(p)
            # 重建优化器（避免 Adam 动量被 NaN 污染）
            self._optimizer = torch.optim.Adam(
                list(self._gnn_extractor.parameters())
                + list(self._actor_head.parameters())
                + list(self._critic_head.parameters()),
                lr=self.lr,
            )

        def _restore_best_or_reinit(self, best_state_dict) -> bool:
            """Phase D 修复：权重 NaN 后恢复 - 优先恢复 best，否则重新初始化

            Returns:
                True 如果恢复了 best，False 如果重新初始化
            """
            if best_state_dict is not None:
                try:
                    self._gnn_extractor.load_state_dict(best_state_dict["gnn"])
                    self._actor_head.load_state_dict(best_state_dict["actor"])
                    self._critic_head.load_state_dict(best_state_dict["critic"])
                    # 重建优化器
                    self._optimizer = torch.optim.Adam(
                        list(self._gnn_extractor.parameters())
                        + list(self._actor_head.parameters())
                        + list(self._critic_head.parameters()),
                        lr=self.lr,
                    )
                    logger.warning("NaN 权重已从 Best Checkpoint 恢复")
                    return True
                except Exception as e:
                    logger.warning(f"从 Best 恢复失败: {e}，改为重新初始化")
            self._reinit_weights()
            return False

        # ====================================================================
        # 推理
        # ====================================================================
        def _get_node_embeddings(self) -> torch.Tensor:
            """前向计算所有节点的嵌入 [N, hidden_dim]"""
            return self._gnn_extractor(
                self._node_features, self._edge_index, self._edge_attr
            )

        def _get_weights_tensor(self, env: LogisticsEnvV2) -> torch.Tensor:
            """获取当前环境的权重向量 [WEIGHTS_DIM]"""
            return torch.tensor(
                list(env.weights), dtype=torch.float32, device=self.device
            )

        def _score_feasible_actions(
            self, node_emb: torch.Tensor, current_idx: int,
            feasible_actions: List[int],
            weights: torch.Tensor,
        ) -> torch.Tensor:
            """对可行动作打分（核心前向逻辑，训练和推理共用）

            Phase C 修复：Actor 输入拼接 weights，让 PPO 感知当前偏好

            Args:
                node_emb: [N, hidden_dim] GNN 输出
                current_idx: 当前节点索引
                feasible_actions: 可行链路索引列表
                weights: [WEIGHTS_DIM] 当前权重向量

            Returns:
                scores: [k] 每个可行动作的得分（logits，未归一化）
            """
            curr_emb = node_emb[current_idx]  # [hidden_dim]

            # 邻居节点嵌入
            neighbor_indices = [self._env_links[a].to_idx for a in feasible_actions]
            neighbor_idx_tensor = torch.tensor(
                neighbor_indices, dtype=torch.long, device=self.device
            )
            neighbor_embs = node_emb[neighbor_idx_tensor]  # [k, hidden_dim]

            # 链路特征
            action_tensor = torch.tensor(
                feasible_actions, dtype=torch.long, device=self.device
            )
            link_feats = self._link_features[action_tensor]  # [k, LINK_FEAT_DIM]

            # Phase C 修复：将 weights 扩展到 [k, WEIGHTS_DIM] 并拼接
            k = len(feasible_actions)
            weights_expanded = weights.unsqueeze(0).expand(k, -1)  # [k, WEIGHTS_DIM]

            # 构造 Actor 输入（拼接 weights）
            curr_emb_expanded = curr_emb.unsqueeze(0).expand_as(neighbor_embs)
            actor_input = torch.cat([
                curr_emb_expanded,
                neighbor_embs,
                link_feats,
                weights_expanded,  # Phase C 修复：拼接权重向量
            ], dim=-1)  # [k, hidden_dim*2 + LINK_FEAT_DIM + WEIGHTS_DIM]

            scores = self._actor_head(actor_input).squeeze(-1)  # [k]
            return scores

        def act(
            self,
            state: np.ndarray,
            env: LogisticsEnvV2,
            deterministic: bool = False,
        ) -> Tuple[int, float, float]:
            """从策略采样动作

            Args:
                state: 当前状态向量 [10]（含 weights，但实际从 env 取当前节点和权重）
                env: 环境（用于获取可行动作和当前权重）
                deterministic: True 贪心，False 随机采样

            Returns:
                action: 链路索引（在 env.links 中的位置）
                log_prob: 该动作的对数概率
                value: 状态价值 V(s)

            Phase D 炼丹调优：
                - 训练前 explore_episodes 轮（默认 1000），以 epsilon 概率随机选择动作
                - 强迫 AI 探索跳数多但便宜的海运节点（苏伊士、科伦坡、比雷埃夫斯）
                - epsilon 随训练轮数衰减，从 0.3 衰减到 0.05
            """
            feasible_actions = env.get_feasible_action_indices()
            if not feasible_actions:
                return -1, 0.0, 0.0  # 无可行动作

            # Phase D：epsilon-greedy 探索（仅在训练阶段 + 非 deterministic 时生效）
            if (
                not deterministic
                and self._current_episode < self.explore_episodes
                and np.random.random() < self.epsilon
            ):
                # 随机探索：从可行动作中均匀采样
                k = len(feasible_actions)
                action_idx = int(np.random.randint(k))
                action = feasible_actions[action_idx]
                # log_prob 用均匀分布的对数概率（保证 PPO 更新可计算）
                log_prob = float(np.log(1.0 / k + 1e-8))
                # value 仍用网络计算（让 critic 学习）
                with torch.no_grad():
                    node_emb = self._get_node_embeddings()
                    curr_emb = node_emb[env.current_idx]
                    weights = self._get_weights_tensor(env)
                    critic_input = torch.cat([curr_emb, weights], dim=-1)
                    value = self._critic_head(critic_input).squeeze(-1)
                return action, log_prob, float(value.item())

            with torch.no_grad():
                node_emb = self._get_node_embeddings()  # [N, hidden_dim]
                current_idx = env.current_idx
                weights = self._get_weights_tensor(env)  # [WEIGHTS_DIM]

                scores = self._score_feasible_actions(
                    node_emb, current_idx, feasible_actions, weights
                )  # [k]

                # Critic: 用当前节点嵌入 + weights 计算 V(s)
                curr_emb = node_emb[current_idx]
                critic_input = torch.cat([curr_emb, weights], dim=-1)
                value = self._critic_head(critic_input).squeeze(-1)  # [1]

                # Phase C 修复：数值稳定化 - softmax 前减最大值，避免溢出
                # 同时检测 NaN，回退到均匀分布
                if torch.isnan(scores).any() or torch.isinf(scores).any():
                    # NaN/Inf 检测：回退到均匀分布
                    k = len(feasible_actions)
                    probs = torch.ones(k, device=self.device) / k
                    value = torch.tensor(0.0, device=self.device)
                else:
                    # 数值稳定 softmax：减最大值
                    scores_stable = scores - scores.max()
                    probs = F.softmax(scores_stable, dim=0)  # [k]
                    # 二次检测（极端情况）
                    if torch.isnan(probs).any() or probs.sum() <= 0:
                        k = len(feasible_actions)
                        probs = torch.ones(k, device=self.device) / k

                if deterministic:
                    action_idx = int(torch.argmax(probs).item())
                else:
                    # 采样
                    dist = Categorical(probs)
                    action_idx = int(dist.sample().item())

                # 映射回原始链路索引
                action = feasible_actions[action_idx]
                log_prob = float(torch.log(probs[action_idx] + 1e-8).item())

            return action, log_prob, float(value.item())

        def predict(self, state: np.ndarray, env: LogisticsEnvV2) -> int:
            """贪心选择最优动作"""
            action, _, _ = self.act(state, env, deterministic=True)
            return action

        def get_action_scores(
            self,
            state: np.ndarray,
            env: LogisticsEnvV2,
        ) -> np.ndarray:
            """返回所有可行动作的归一化概率"""
            feasible_actions = env.get_feasible_action_indices()
            if not feasible_actions:
                return np.zeros(0, dtype=np.float32)

            with torch.no_grad():
                node_emb = self._get_node_embeddings()
                current_idx = env.current_idx
                weights = self._get_weights_tensor(env)
                scores = self._score_feasible_actions(
                    node_emb, current_idx, feasible_actions, weights
                )
                probs = F.softmax(scores, dim=0)

            return probs.cpu().numpy()

        # ====================================================================
        # 训练
        # ====================================================================
        def train(
            self,
            env: LogisticsEnvV2,
            episodes: int,
            weights: Tuple[float, float, float, float],
            start_code: str,
            end_code: str,
            callback: Optional[TrainCallback] = None,
            weights_schedule: str = "fixed",
        ) -> Dict[str, Any]:
            """执行 PPO 训练

            Args:
                env: 已加载路网的 V2 环境
                episodes: 训练回合数
                weights: (cost, time, carbon, risk) 奖励权重
                start_code: 起点节点 code
                end_code: 终点节点 code
                callback: 回调函数
                weights_schedule: 权重调度策略
                    - "fixed": 固定权重
                    - "random": 每个 episode 随机生成权重（强制学习不同偏好）

            Returns:
                训练统计 {final_reward, final_loss, episodes_run, history}
            """
            if self._gnn_extractor is None:
                raise RuntimeError("未绑定环境，请先调用 bind_env(env)")

            history: List[Dict[str, float]] = []
            last_reward = 0.0
            last_loss = 0.0
            run = 0

            # Phase D 炼丹调优：Best Model Checkpoint 跟踪
            # 保存评估期平均 Reward 最高的那次权重（而非最后一次）
            # Phase D 二次调优：只统计 success=True 的 episode，避免死胡同拉低平均
            best_avg_reward = float("-inf")
            best_episode = -1
            best_state_dict = None  # 保存最佳模型参数
            eval_window = 100  # 评估窗口：每 eval_window 轮计算一次平均 reward

            for ep in range(1, episodes + 1):
                run = ep

                # Phase D：更新当前训练轮数 + epsilon 衰减
                self._current_episode = ep
                if ep <= self.explore_episodes:
                    # epsilon 随训练轮数衰减（从 0.3 衰减到 0.05）
                    self.epsilon = max(
                        self.epsilon_min,
                        self.epsilon * self.epsilon_decay,
                    )
                else:
                    # 超过探索阶段后，关闭 epsilon-greedy
                    self.epsilon = 0.0

                # Phase C 修复：支持训练时随机重置权重
                if weights_schedule == "random" and ep > 1:
                    cur_weights = self._sample_extreme_weights()
                else:
                    cur_weights = weights

                state = env.reset(start_code, end_code, cur_weights)

                # 收集一条轨迹
                ep_states: List[np.ndarray] = []
                ep_actions: List[int] = []
                ep_log_probs: List[float] = []
                ep_rewards: List[float] = []
                ep_values: List[float] = []
                ep_feasible_actions: List[List[int]] = []
                ep_current_idx: List[int] = []
                ep_weights: List[Tuple[float, float, float, float]] = []
                done = False
                ep_reward = 0.0

                while not done:
                    feasible = env.get_feasible_action_indices()
                    if not feasible:
                        break  # 死胡同

                    ep_current_idx.append(env.current_idx)
                    ep_weights.append(cur_weights)

                    action, log_prob, value = self.act(state, env, deterministic=False)
                    if action < 0:
                        ep_current_idx.pop()
                        ep_weights.pop()
                        break

                    next_state, reward, done, info = env.step(action)

                    ep_states.append(state.copy())
                    ep_actions.append(action)
                    ep_log_probs.append(log_prob)
                    ep_rewards.append(reward)
                    ep_values.append(value)
                    ep_feasible_actions.append(feasible)

                    state = next_state
                    ep_reward += reward

                # PPO 更新
                if len(ep_states) >= 2:
                    loss = self._update(
                        ep_states, ep_actions, ep_log_probs,
                        ep_rewards, ep_values, ep_feasible_actions,
                        ep_current_idx, ep_weights,
                    )
                    last_loss = float(loss)
                else:
                    last_loss = 0.0

                # Phase D 修复：NaN 权重检测 + 自动恢复
                # 一旦权重变 NaN，所有后续训练都无效，必须立即恢复
                if self._has_nan_weights():
                    restored = self._restore_best_or_reinit(best_state_dict)
                    if restored:
                        print(f"[Episode {ep}] NaN 权重检测：已从 Best Checkpoint 恢复")
                    else:
                        print(f"[Episode {ep}] NaN 权重检测：已重新初始化网络")
                        # 重新初始化后清空 best_state_dict，因为旧 best 可能也已问题
                        best_state_dict = None
                        best_avg_reward = float("-inf")
                        best_episode = -1
                    last_loss = 0.0

                last_reward = float(ep_reward)
                history.append({
                    "episode": ep,
                    "reward": ep_reward,
                    "loss": last_loss,
                    "steps": env.step_count,
                    "success": env.current_idx == env.end_idx,
                    "weights": cur_weights,
                })

                # Phase D：Best Model Checkpoint 评估
                # 每 eval_window 轮计算一次窗口平均 reward，与历史最佳比较
                # Phase D 二次调优：只统计 success=True 的 episode，避免死胡同拉低平均
                if ep % eval_window == 0 and len(history) >= eval_window:
                    recent = history[-eval_window:]
                    success_recent = [h for h in recent if h.get("success", False)]
                    if len(success_recent) >= 10:  # 至少 10 个成功 episode 才评估
                        avg_reward = float(np.mean([h["reward"] for h in success_recent]))
                        if avg_reward > best_avg_reward:
                            best_avg_reward = avg_reward
                            best_episode = ep
                            # 保存当前网络参数的深拷贝
                            best_state_dict = {
                                "gnn": {k: v.clone() for k, v in self._gnn_extractor.state_dict().items()},
                                "actor": {k: v.clone() for k, v in self._actor_head.state_dict().items()},
                                "critic": {k: v.clone() for k, v in self._critic_head.state_dict().items()},
                            }

                if callback is not None:
                    logs = [
                        f"[Episode {ep}/{episodes}] reward={ep_reward:.3f}, loss={last_loss:.4f}, "
                        f"eps={self.epsilon:.3f}",
                        f"[Weights] cost={cur_weights[0]:.2f} time={cur_weights[1]:.2f} "
                        f"carbon={cur_weights[2]:.2f} risk={cur_weights[3]:.2f}",
                        f"[Path] steps={env.step_count}, success={env.current_idx == env.end_idx}",
                    ]
                    callback(ep, episodes, ep_reward, last_loss, logs)

            # Phase D：训练结束，恢复最佳模型参数（如果有）
            if best_state_dict is not None:
                print(f"[Best Checkpoint] 恢复最佳模型：episode={best_episode}, "
                      f"avg_reward={best_avg_reward:.3f}")
                self._gnn_extractor.load_state_dict(best_state_dict["gnn"])
                self._actor_head.load_state_dict(best_state_dict["actor"])
                self._critic_head.load_state_dict(best_state_dict["critic"])
            else:
                print(f"[Best Checkpoint] 未触发评估窗口，使用最终模型")

            return {
                "final_reward": last_reward,
                "final_loss": last_loss,
                "episodes_run": run,
                "history": history,
                "best_avg_reward": best_avg_reward,
                "best_episode": best_episode,
            }

        def _sample_extreme_weights(self) -> Tuple[float, float, float, float]:
            """随机采样一组极端权重（用于训练时强制学习不同偏好）"""
            presets = [
                (0.80, 0.05, 0.05, 0.10),  # 成本优先
                (0.05, 0.80, 0.05, 0.10),  # 时效优先
                (0.05, 0.05, 0.80, 0.10),  # 绿色优先
                (0.10, 0.15, 0.10, 0.65),  # 稳健优先
                (0.25, 0.25, 0.25, 0.25),  # 均衡
            ]
            if np.random.random() < 0.7:
                return presets[np.random.randint(len(presets))]
            else:
                w = np.random.dirichlet([1.0, 1.0, 1.0, 1.0])
                return tuple(float(x) for x in w)

        def _update(
            self,
            states: List[np.ndarray],
            actions: List[int],
            log_probs: List[float],
            rewards: List[float],
            values: List[float],
            feasible_actions_per_step: List[List[int]],
            current_idx_per_step: List[int],
            weights_per_step: List[Tuple[float, float, float, float]],
        ) -> float:
            """PPO 小批量更新（完整版：GAE + Clip + 熵正则 + 权重感知）

            Phase C 修复：每步使用对应的 weights 重新前向计算
            """
            n = len(states)
            if n < 2:
                return 0.0

            # ============ 1. GAE 广义优势估计 ============
            r = torch.as_tensor(np.array(rewards), dtype=torch.float32, device=self.device)
            v_old = torch.as_tensor(np.array(values), dtype=torch.float32, device=self.device)
            old_log_probs = torch.as_tensor(
                np.array(log_probs), dtype=torch.float32, device=self.device
            )

            advantages = torch.zeros_like(r)
            last_gae = 0.0
            for t in reversed(range(n)):
                next_value = v_old[t + 1] if t + 1 < n else 0.0
                delta = r[t] + self.gamma * next_value - v_old[t]
                last_gae = delta + self.gamma * self.gae_lambda * last_gae
                advantages[t] = last_gae
            returns = advantages + v_old

            # 标准化优势
            if advantages.numel() > 1:
                advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

            # ============ 2. 重新前向计算 GNN 嵌入 ============
            node_emb = self._get_node_embeddings()  # [N, hidden_dim]

            # ============ 3. 对每个时间步重新计算 log_prob 和 value ============
            new_log_probs = torch.zeros(n, device=self.device)
            new_values = torch.zeros(n, device=self.device)
            entropy_sum = torch.zeros(1, device=self.device)

            actions_tensor = torch.as_tensor(
                np.array(actions), dtype=torch.long, device=self.device
            )

            valid_count = 0
            for t in range(n):
                feasible = feasible_actions_per_step[t]
                cur_idx = current_idx_per_step[t]
                cur_weights = weights_per_step[t]
                if not feasible:
                    new_log_probs[t] = old_log_probs[t].detach()
                    new_values[t] = returns[t].detach()
                    continue
                valid_count += 1

                # 当前节点嵌入
                curr_emb = node_emb[cur_idx]  # [hidden_dim]

                # 当前权重向量
                weights_tensor = torch.tensor(
                    list(cur_weights), dtype=torch.float32, device=self.device
                )

                # 对可行动作重新打分（拼接 weights）
                scores = self._score_feasible_actions(
                    node_emb, cur_idx, feasible, weights_tensor
                )  # [k]
                log_probs_t = F.log_softmax(scores, dim=0)  # [k]
                probs_t = torch.exp(log_probs_t)

                # 找到实际采取的动作在 feasible 中的位置
                action_t = int(actions_tensor[t].item())
                try:
                    action_pos = feasible.index(action_t)
                except ValueError:
                    new_log_probs[t] = old_log_probs[t].detach()
                    new_values[t] = returns[t].detach()
                    continue

                new_log_probs[t] = log_probs_t[action_pos]

                # Critic: 用当前节点嵌入 + weights 计算 V(s_t)
                critic_input = torch.cat([curr_emb, weights_tensor], dim=-1)
                new_values[t] = self._critic_head(critic_input).squeeze(-1)

                # 熵正则：在可行动作子集上的熵
                entropy_sum = entropy_sum + -(probs_t * log_probs_t).sum()

            entropy_mean = entropy_sum / max(1, valid_count)

            # ============ 4. PPO Clip Loss ============
            # Phase D 修复：clamp log_diff 防止 exp 溢出导致 NaN
            log_diff = torch.clamp(new_log_probs - old_log_probs, -10.0, 10.0)
            ratio = torch.exp(log_diff)
            ratio = torch.clamp(ratio, 0.0, 20.0)  # 防止极端比率
            surr1 = ratio * advantages
            surr2 = torch.clamp(
                ratio, 1.0 - self.clip_epsilon, 1.0 + self.clip_epsilon
            ) * advantages
            actor_loss = -torch.min(surr1, surr2).mean()

            # Critic loss
            critic_loss = F.mse_loss(new_values, returns.detach())

            # 总损失
            loss = (
                actor_loss
                + self.value_loss_coef * critic_loss
                - self.entropy_coef * entropy_mean
            )

            # Phase C 修复：NaN 检测，跳过本次更新（避免梯度爆炸连锁）
            if torch.isnan(loss) or torch.isinf(loss):
                logger.warning(f"检测到 NaN/Inf loss，跳过本次 PPO 更新")
                return 0.0

            self._optimizer.zero_grad()
            loss.backward()
            # 梯度裁剪（防止爆炸）- Phase D: 0.5 → 0.3 更严格
            nn.utils.clip_grad_norm_(
                list(self._gnn_extractor.parameters())
                + list(self._actor_head.parameters())
                + list(self._critic_head.parameters()),
                0.3,
            )
            # 检测梯度 NaN，跳过更新
            has_nan_grad = False
            for param in list(self._gnn_extractor.parameters()) \
                    + list(self._actor_head.parameters()) \
                    + list(self._critic_head.parameters()):
                if param.grad is not None and (torch.isnan(param.grad).any() or torch.isinf(param.grad).any()):
                    has_nan_grad = True
                    break
            if has_nan_grad:
                logger.warning(f"检测到 NaN/Inf 梯度，跳过 optimizer.step()")
                return 0.0

            self._optimizer.step()

            return float(loss.item())

        # ====================================================================
        # 持久化
        # ====================================================================
        def save(self, path: str) -> None:
            """保存模型权重"""
            if self._gnn_extractor is None:
                raise RuntimeError("未绑定环境，无可保存内容")
            os.makedirs(os.path.dirname(path), exist_ok=True)
            torch.save({
                "gnn_state_dict": self._gnn_extractor.state_dict(),
                "actor_state_dict": self._actor_head.state_dict(),
                "critic_state_dict": self._critic_head.state_dict(),
                "config": {
                    "hidden_dim": self.hidden_dim,
                    "lr": self.lr,
                    "gamma": self.gamma,
                    "gae_lambda": self.gae_lambda,
                    "clip_epsilon": self.clip_epsilon,
                    "entropy_coef": self.entropy_coef,
                    "value_loss_coef": self.value_loss_coef,
                    "batch_size": self.batch_size,
                    "epochs": self.epochs,
                },
                "arch": "gnn_weights_aware",
                "backend": "torch",
            }, path)
            logger.info(f"PPOAgentV2 权重已保存: {path}")

        def load(self, path: str) -> None:
            """加载模型权重（兼容旧版权重）"""
            if self._gnn_extractor is None:
                raise RuntimeError("未绑定环境，请先调用 bind_env(env)")
            ckpt = torch.load(path, map_location=self.device, weights_only=False)
            self._gnn_extractor.load_state_dict(ckpt["gnn_state_dict"])

            arch = ckpt.get("arch", "gnn")
            if arch == "gnn_weights_aware":
                self._actor_head.load_state_dict(ckpt["actor_state_dict"])
                self._critic_head.load_state_dict(ckpt["critic_state_dict"])
            else:
                logger.warning(
                    f"加载旧版权重（arch={arch}），Actor/Critic 结构不匹配，"
                    f"将使用随机初始化的 weights 感知层"
                )
            logger.info(f"PPOAgentV2 权重已加载: {path} (arch={arch})")


else:
    # PyTorch 不可用时的占位类
    class PPOAgentV2:  # type: ignore[no-redef]
        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "PyTorch 未安装，PPOAgentV2 不可用。"
                "请运行: pip install torch"
            )


def build_agent_v2(hidden_dim: int = 64, lr: float = 1e-3) -> "PPOAgentV2":
    """构建 PPOAgentV2 实例（工厂函数）"""
    if not HAS_TORCH:
        raise RuntimeError("PyTorch 未安装")
    return PPOAgentV2(hidden_dim=hidden_dim, lr=lr)
