"""Clipped PPO 智能体实现（Actor-Critic）

优先使用 PyTorch 实现；若 import torch 失败，自动回退到 numpy 简化版实现。

核心组件：
    - GAE 广义优势估计
    - 裁剪目标函数（clip=0.2）
    - 熵正则化
    - 小批量梯度更新

对外方法：
    - train(env, episodes, params, callback) -> 训练日志
    - predict(state, action_mask) -> 贪心动作
    - save(path) / load(path) -> 权重持久化
"""
from __future__ import annotations

import os
import pickle
import time
from typing import Any, Callable, Dict, List, Optional, Tuple

import numpy as np

from .environment import LogisticsEnv, NODES, NODE_INDEX, STATE_DIM


# ===== 尝试导入 torch =====
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.distributions import Categorical
    HAS_TORCH = True
except ImportError:
    HAS_TORCH = False
    torch = None  # type: ignore


# ===== 回调类型 =====
TrainCallback = Callable[[int, int, float, float, List[str]], None]


# ============================================================
# PyTorch 版 PPO
# ============================================================
if HAS_TORCH:

    class ActorCriticNet(nn.Module):
        """Actor-Critic 双头网络"""

        def __init__(self, state_dim: int, action_dim: int, hidden: int = 128) -> None:
            super().__init__()
            # 共享特征层
            self.shared = nn.Sequential(
                nn.Linear(state_dim, hidden),
                nn.Tanh(),
                nn.Linear(hidden, hidden),
                nn.Tanh(),
            )
            # Actor 头（策略）
            self.actor = nn.Linear(hidden, action_dim)
            # Critic 头（价值）
            self.critic = nn.Linear(hidden, 1)

        def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
            feat = self.shared(x)
            logits = self.actor(feat)
            value = self.critic(feat)
            return logits, value

    class PPOAgent:
        """PyTorch 版 PPO 智能体"""

        def __init__(self, state_dim: int = STATE_DIM, action_dim: int = 48,
                     hidden: int = 128, lr: float = 3e-3, gamma: float = 0.99,
                     gae_lambda: float = 0.95, clip_epsilon: float = 0.2,
                     entropy_coef: float = 0.01, value_loss_coef: float = 0.5,
                     batch_size: int = 64, epochs: int = 10) -> None:
            self.state_dim = state_dim
            self.action_dim = action_dim
            self.hidden = hidden
            self.lr = lr
            self.gamma = gamma
            self.gae_lambda = gae_lambda
            self.clip_epsilon = clip_epsilon
            self.entropy_coef = entropy_coef
            self.value_loss_coef = value_loss_coef
            self.batch_size = batch_size
            self.epochs = epochs

            self.device = torch.device("cpu")
            self.net = ActorCriticNet(state_dim, action_dim, hidden).to(self.device)
            self.optimizer = torch.optim.Adam(self.net.parameters(), lr=lr)

        # ---------- 推理 ----------
        def _act(self, state: np.ndarray, action_mask: np.ndarray,
                 deterministic: bool = False) -> Tuple[int, float, float]:
            """从策略采样动作

            Returns: (action, log_prob, value)
            """
            s = torch.as_tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)
            m = torch.as_tensor(action_mask, dtype=torch.float32, device=self.device).unsqueeze(0)
            with torch.no_grad():
                logits, value = self.net(s)
                # 屏蔽非法动作
                masked_logits = logits + (m - 1.0) * 1e9
                if deterministic:
                    action = int(torch.argmax(masked_logits, dim=1).item())
                    log_prob = float(F.log_softmax(masked_logits, dim=1)[0, action].item())
                else:
                    dist = Categorical(logits=masked_logits)
                    action_t = dist.sample()
                    action = int(action_t.item())
                    log_prob = float(dist.log_prob(action_t).item())
            return action, log_prob, float(value.item())

        def predict(self, state: np.ndarray, action_mask: np.ndarray) -> int:
            """贪心选择最优动作"""
            action, _, _ = self._act(state, action_mask, deterministic=True)
            return action

        def get_action_scores(self, state: np.ndarray,
                              action_mask: np.ndarray) -> np.ndarray:
            """返回所有动作的归一化评分（0-1，已屏蔽非法动作）"""
            s = torch.as_tensor(state, dtype=torch.float32, device=self.device).unsqueeze(0)
            m = torch.as_tensor(action_mask, dtype=torch.float32, device=self.device).unsqueeze(0)
            with torch.no_grad():
                logits, _ = self.net(s)
                masked_logits = logits + (m - 1.0) * 1e9
                probs = torch.softmax(masked_logits, dim=1).squeeze(0).cpu().numpy()
            return probs

        # ---------- 训练 ----------
        def train(self, env: LogisticsEnv, episodes: int,
                  weights: Tuple[float, float, float, float],
                  start_node: str = "北京", end_node: str = "汉堡",
                  callback: Optional[TrainCallback] = None,
                  pause_check: Optional[Callable[[], bool]] = None,
                  total_episodes_for_progress: int = 0
                  ) -> Dict[str, Any]:
            """执行训练

            Args:
                env: 物流环境
                episodes: 训练回合数
                weights: (cost, time, carbon, risk) 奖励权重
                start_node/end_node: 训练用起终点
                callback: 每回合回调 (episode, total, reward, loss, logs)
                pause_check: 返回 True 表示应暂停退出
                total_episodes_for_progress: 用于日志展示的总回合数
            Returns:
                训练统计 {final_reward, final_loss, episodes_run}
            """
            total = episodes if total_episodes_for_progress <= 0 else total_episodes_for_progress
            last_reward = 0.0
            last_loss = 0.0
            run = 0
            for ep in range(1, episodes + 1):
                if pause_check is not None and pause_check():
                    break
                run = ep
                state = env.reset(start_node, end_node, weights)
                ep_states: List[np.ndarray] = []
                ep_actions: List[int] = []
                ep_log_probs: List[float] = []
                ep_rewards: List[float] = []
                ep_values: List[float] = []
                ep_masks: List[np.ndarray] = []
                done = False
                ep_reward = 0.0
                # 收集一条轨迹
                while not done:
                    mask = env.get_action_mask()
                    if mask.sum() == 0:
                        break
                    action, log_prob, value = self._act(state, mask, deterministic=False)
                    next_state, reward, done, _ = env.step(action)
                    ep_states.append(state.copy())
                    ep_actions.append(action)
                    ep_log_probs.append(log_prob)
                    ep_rewards.append(reward)
                    ep_values.append(value)
                    ep_masks.append(mask.copy())
                    state = next_state
                    ep_reward += reward
                # PPO 更新
                if len(ep_states) >= 2:
                    loss = self._update(ep_states, ep_actions, ep_log_probs,
                                        ep_rewards, ep_values)
                    last_loss = float(loss)
                last_reward = float(ep_reward)
                if callback is not None:
                    logs = [
                        f"[Episode {ep}/{total}] reward={ep_reward:.3f}, loss={last_loss:.4f}",
                        f"[Weights] cost={weights[0]:.2f} time={weights[1]:.2f} "
                        f"carbon={weights[2]:.2f} risk={weights[3]:.2f}",
                        f"[Scene] {env.scene} | steps={env.step_count}",
                    ]
                    callback(ep, total, ep_reward, last_loss, logs)
            return {
                "final_reward": last_reward,
                "final_loss": last_loss,
                "episodes_run": run,
            }

        def _update(self, states: List[np.ndarray], actions: List[int],
                    log_probs: List[float], rewards: List[float],
                    values: List[float]) -> float:
            """PPO 小批量更新"""
            s = torch.as_tensor(np.array(states), dtype=torch.float32, device=self.device)
            a = torch.as_tensor(np.array(actions), dtype=torch.long, device=self.device)
            old_log_probs = torch.as_tensor(np.array(log_probs), dtype=torch.float32, device=self.device)
            r = torch.as_tensor(np.array(rewards), dtype=torch.float32, device=self.device)
            v = torch.as_tensor(np.array(values), dtype=torch.float32, device=self.device)

            # GAE
            advantages = torch.zeros_like(r)
            last_gae = 0.0
            for t in reversed(range(len(r))):
                next_value = v[t + 1] if t + 1 < len(r) else 0.0
                delta = r[t] + self.gamma * next_value - v[t]
                last_gae = delta + self.gamma * self.gae_lambda * last_gae
                advantages[t] = last_gae
            returns = advantages + v

            # 标准化优势
            if advantages.numel() > 1:
                advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

            # 小批量更新
            n = len(states)
            bs = min(self.batch_size, n)
            total_loss_val = 0.0
            num_updates = 0
            for _ in range(self.epochs):
                perm = torch.randperm(n)
                for start in range(0, n, bs):
                    idx = perm[start:start + bs]
                    logits, value = self.net(s[idx])
                    # 动作掩码（每步不同，需重新计算）
                    # 注意：这里简化处理，直接用 logits（非法动作已在采样时屏蔽）
                    dist = Categorical(logits=logits)
                    new_log_probs = dist.log_prob(a[idx])
                    entropy = dist.entropy().mean()
                    # 裁剪目标
                    ratio = torch.exp(new_log_probs - old_log_probs[idx])
                    surr1 = ratio * advantages[idx]
                    surr2 = torch.clamp(ratio, 1.0 - self.clip_epsilon, 1.0 + self.clip_epsilon) * advantages[idx]
                    actor_loss = -torch.min(surr1, surr2).mean()
                    critic_loss = F.mse_loss(value.view(-1), returns[idx])
                    loss = actor_loss + self.value_loss_coef * critic_loss - self.entropy_coef * entropy
                    self.optimizer.zero_grad()
                    loss.backward()
                    nn.utils.clip_grad_norm_(self.net.parameters(), 0.5)
                    self.optimizer.step()
                    total_loss_val += float(loss.item())
                    num_updates += 1
            return total_loss_val / max(1, num_updates)

        # ---------- 持久化 ----------
        def save(self, path: str) -> None:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            torch.save({
                "state_dict": self.net.state_dict(),
                "config": {
                    "state_dim": self.state_dim,
                    "action_dim": self.action_dim,
                    "hidden": self.hidden,
                    "lr": self.lr,
                    "gamma": self.gamma,
                    "gae_lambda": self.gae_lambda,
                    "clip_epsilon": self.clip_epsilon,
                    "entropy_coef": self.entropy_coef,
                    "value_loss_coef": self.value_loss_coef,
                    "batch_size": self.batch_size,
                    "epochs": self.epochs,
                },
                "backend": "torch",
            }, path)

        def load(self, path: str) -> None:
            ckpt = torch.load(path, map_location=self.device, weights_only=False)
            self.net.load_state_dict(ckpt["state_dict"])

else:

    # ============================================================
    # numpy 回退版 PPO（多层感知机 + 数值梯度）
    # ============================================================
    class PPOAgent:
        """numpy 简化版 PPO（当 torch 不可用时回退）"""

        def __init__(self, state_dim: int = STATE_DIM, action_dim: int = 48,
                     hidden: int = 64, lr: float = 3e-3, gamma: float = 0.99,
                     gae_lambda: float = 0.95, clip_epsilon: float = 0.2,
                     entropy_coef: float = 0.01, value_loss_coef: float = 0.5,
                     batch_size: int = 64, epochs: int = 10) -> None:
            self.state_dim = state_dim
            self.action_dim = action_dim
            self.hidden = hidden
            self.lr = lr
            self.gamma = gamma
            self.gae_lambda = gae_lambda
            self.clip_epsilon = clip_epsilon
            self.entropy_coef = entropy_coef
            self.value_loss_coef = value_loss_coef
            self.batch_size = batch_size
            self.epochs = epochs
            rng = np.random.default_rng(42)
            # Actor: state -> action logits
            self.W1 = rng.standard_normal((state_dim, hidden)).astype(np.float32) * 0.1
            self.b1 = np.zeros(hidden, dtype=np.float32)
            self.Wa = rng.standard_normal((hidden, action_dim)).astype(np.float32) * 0.1
            self.ba = np.zeros(action_dim, dtype=np.float32)
            # Critic: state -> value
            self.Wc = rng.standard_normal((hidden, 1)).astype(np.float32) * 0.1
            self.bc = np.zeros(1, dtype=np.float32)

        def _forward(self, state: np.ndarray) -> Tuple[np.ndarray, float]:
            h = np.tanh(state @ self.W1 + self.b1)
            logits = h @ self.Wa + self.ba
            value = float((h @ self.Wc + self.bc)[0])
            return logits, value

        def _softmax_mask(self, logits: np.ndarray, mask: np.ndarray) -> np.ndarray:
            masked = logits + (mask - 1.0) * 1e9
            e = np.exp(masked - masked.max())
            return e / (e.sum() + 1e-8)

        def _act(self, state: np.ndarray, action_mask: np.ndarray,
                 deterministic: bool = False) -> Tuple[int, float, float]:
            logits, value = self._forward(state)
            probs = self._softmax_mask(logits, action_mask)
            if deterministic:
                action = int(np.argmax(probs))
            else:
                action = int(np.random.choice(self.action_dim, p=probs))
            log_prob = float(np.log(probs[action] + 1e-8))
            return action, log_prob, value

        def predict(self, state: np.ndarray, action_mask: np.ndarray) -> int:
            action, _, _ = self._act(state, action_mask, deterministic=True)
            return action

        def get_action_scores(self, state: np.ndarray,
                              action_mask: np.ndarray) -> np.ndarray:
            """返回所有动作的归一化评分（0-1，已屏蔽非法动作）"""
            logits, _ = self._forward(state)
            return self._softmax_mask(logits, action_mask)

        def train(self, env: LogisticsEnv, episodes: int,
                  weights: Tuple[float, float, float, float],
                  start_node: str = "北京", end_node: str = "汉堡",
                  callback: Optional[TrainCallback] = None,
                  pause_check: Optional[Callable[[], bool]] = None,
                  total_episodes_for_progress: int = 0
                  ) -> Dict[str, Any]:
            total = episodes if total_episodes_for_progress <= 0 else total_episodes_for_progress
            last_reward = 0.0
            last_loss = 0.0
            run = 0
            for ep in range(1, episodes + 1):
                if pause_check is not None and pause_check():
                    break
                run = ep
                state = env.reset(start_node, end_node, weights)
                ep_states: List[np.ndarray] = []
                ep_actions: List[int] = []
                ep_log_probs: List[float] = []
                ep_rewards: List[float] = []
                ep_values: List[float] = []
                ep_masks: List[np.ndarray] = []
                done = False
                ep_reward = 0.0
                while not done:
                    mask = env.get_action_mask()
                    if mask.sum() == 0:
                        break
                    action, log_prob, value = self._act(state, mask, deterministic=False)
                    next_state, reward, done, _ = env.step(action)
                    ep_states.append(state.copy())
                    ep_actions.append(action)
                    ep_log_probs.append(log_prob)
                    ep_rewards.append(reward)
                    ep_values.append(value)
                    ep_masks.append(mask.copy())
                    state = next_state
                    ep_reward += reward
                if len(ep_states) >= 2:
                    loss = self._update(ep_states, ep_actions, ep_log_probs,
                                        ep_rewards, ep_values, ep_masks)
                    last_loss = float(loss)
                last_reward = float(ep_reward)
                if callback is not None:
                    logs = [
                        f"[Episode {ep}/{total}] reward={ep_reward:.3f}, loss={last_loss:.4f}",
                        f"[Weights] cost={weights[0]:.2f} time={weights[1]:.2f} "
                        f"carbon={weights[2]:.2f} risk={weights[3]:.2f}",
                        f"[Scene] {env.scene} | steps={env.step_count} (numpy backend)",
                    ]
                    callback(ep, total, ep_reward, last_loss, logs)
            return {
                "final_reward": last_reward,
                "final_loss": last_loss,
                "episodes_run": run,
            }

        def _update(self, states, actions, log_probs, rewards, values, masks) -> float:
            # GAE
            T = len(rewards)
            advantages = np.zeros(T, dtype=np.float32)
            last_gae = 0.0
            for t in reversed(range(T)):
                next_v = values[t + 1] if t + 1 < T else 0.0
                delta = rewards[t] + self.gamma * next_v - values[t]
                last_gae = delta + self.gamma * self.gae_lambda * last_gae
                advantages[t] = last_gae
            returns = advantages + np.array(values, dtype=np.float32)
            if T > 1:
                advantages = (advantages - advantages.mean()) / (advantages.std() + 1e-8)

            S = np.array(states, dtype=np.float32)
            A = np.array(actions, dtype=np.int64)
            old_lp = np.array(log_probs, dtype=np.float32)
            M = np.array(masks, dtype=np.float32)
            total_loss = 0.0
            n_upd = 0
            bs = min(self.batch_size, T)
            for _ in range(self.epochs):
                perm = np.random.permutation(T)
                for start in range(0, T, bs):
                    idx = perm[start:start + bs]
                    # 简化的策略梯度更新（数值近似）
                    grad_Wa = np.zeros_like(self.Wa)
                    grad_ba = np.zeros_like(self.ba)
                    grad_Wc = np.zeros_like(self.Wc)
                    grad_bc = np.zeros_like(self.bc)
                    grad_W1 = np.zeros_like(self.W1)
                    grad_b1 = np.zeros_like(self.b1)
                    for i in idx:
                        s = S[i]
                        a = A[i]
                        m = M[i]
                        h = np.tanh(s @ self.W1 + self.b1)
                        logits = h @ self.Wa + self.ba
                        probs = self._softmax_mask(logits, m)
                        new_lp = np.log(probs[a] + 1e-8)
                        ratio = np.exp(new_lp - old_lp[i])
                        adv = advantages[i]
                        clipped = np.clip(ratio, 1 - self.clip_epsilon, 1 + self.clip_epsilon)
                        g = -min(ratio, clipped) * adv
                        # 数值梯度（针对选中动作）
                        dlogits = probs.copy()
                        dlogits[a] -= 1.0
                        dlogits *= g
                        grad_Wa += np.outer(h, dlogits)
                        grad_ba += dlogits
                        grad_h = dlogits @ self.Wa.T
                        grad_h_critic = (value_pred := (h @ self.Wc + self.bc)[0] - returns[i]) * self.Wc[:, 0]
                        grad_h_total = grad_h + grad_h_critic
                        grad_tanh = grad_h_total * (1 - h * h)
                        grad_W1 += np.outer(s, grad_tanh)
                        grad_b1 += grad_tanh
                        grad_Wc += np.outer(h, np.array([(h @ self.Wc + self.bc)[0] - returns[i]]))
                        grad_bc += np.array([(h @ self.Wc + self.bc)[0] - returns[i]])
                    step = self.lr / len(idx)
                    self.W1 -= step * grad_W1
                    self.b1 -= step * grad_b1
                    self.Wa -= step * grad_Wa
                    self.ba -= step * grad_ba
                    self.Wc -= step * grad_Wc * self.value_loss_coef
                    self.bc -= step * grad_bc * self.value_loss_coef
                    total_loss += float(np.mean((returns[idx]) ** 2))
                    n_upd += 1
            return total_loss / max(1, n_upd)

        def save(self, path: str) -> None:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "wb") as f:
                pickle.dump({
                    "weights": {
                        "W1": self.W1, "b1": self.b1,
                        "Wa": self.Wa, "ba": self.ba,
                        "Wc": self.Wc, "bc": self.bc,
                    },
                    "config": {
                        "state_dim": self.state_dim,
                        "action_dim": self.action_dim,
                        "hidden": self.hidden,
                        "lr": self.lr,
                        "gamma": self.gamma,
                        "gae_lambda": self.gae_lambda,
                        "clip_epsilon": self.clip_epsilon,
                        "entropy_coef": self.entropy_coef,
                        "value_loss_coef": self.value_loss_coef,
                        "batch_size": self.batch_size,
                        "epochs": self.epochs,
                    },
                    "backend": "numpy",
                }, f)

        def load(self, path: str) -> None:
            with open(path, "rb") as f:
                ckpt = pickle.load(f)
            w = ckpt["weights"]
            self.W1 = w["W1"]
            self.b1 = w["b1"]
            self.Wa = w["Wa"]
            self.ba = w["ba"]
            self.Wc = w["Wc"]
            self.bc = w["bc"]


def build_agent(action_dim: int, params: Optional[dict] = None) -> PPOAgent:
    """根据参数构建 PPO 智能体

    Args:
        action_dim: 动作空间维度
        params: 超参数字典（对齐 PpoParams）
    """
    p = params or {}
    return PPOAgent(
        state_dim=STATE_DIM,
        action_dim=action_dim,
        hidden=int(p.get("hidden_size", 128 if HAS_TORCH else 64)),
        lr=float(p.get("learning_rate", 3e-3)),
        gamma=float(p.get("gamma", 0.99)),
        gae_lambda=float(p.get("gae_lambda", 0.95)),
        clip_epsilon=float(p.get("clip_epsilon", 0.2)),
        entropy_coef=float(p.get("entropy_coef", 0.01)),
        value_loss_coef=float(p.get("value_loss_coef", 0.5)),
        batch_size=int(p.get("batch_size", 64)),
        epochs=int(p.get("epochs", 10)),
    )


def get_backend() -> str:
    """返回当前使用的后端名称"""
    return "torch" if HAS_TORCH else "numpy"
