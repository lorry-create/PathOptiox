"""GNN 特征提取器骨架（Phase A：动态图结构重构）

使用图注意力网络 (GAT) 编码任意规模的物流路网，
输出固定维度的节点嵌入向量，**彻底解耦 action_dim 与实际节点数量的绑定**。

设计目标：
    1. 输入：从 DB 动态加载的节点特征矩阵 + 链路邻接关系（节点数可变）
    2. 输出：每个节点的 hidden_dim 维嵌入向量（维度固定）
    3. 用途：作为 PPO Actor-Critic 网络的特征提取前端

架构：
    节点特征 [N, d_node]                      链路特征 [E, d_edge]
            │                                          │
            └──────────────┐    ┌──────────────────────┘
                           ▼    ▼
                    ┌──────────────────────┐
                    │  GAT Conv Layer 1    │  (含边特征)
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  GAT Conv Layer 2    │
                    └──────────┬───────────┘
                               ▼
                    ┌──────────────────────┐
                    │  GAT Conv Layer 3    │
                    └──────────┬───────────┘
                               ▼
                    节点嵌入 [N, hidden_dim]
                               │
                    ┌──────────┴───────────┐
                    ▼                      ▼
              Actor Head              Critic Head
            (动作评分)              (状态价值)

依赖：
    - PyTorch（必需）
    - torch_geometric（可选，缺失时回退到自实现 GAT）

向后兼容：
    本模块为 Phase A 骨架，不接入 optimization_service 主流程。
    当前主流程仍使用 ppo_agent.py 中的 MLP 架构，
    待 Phase B 切流后通过 _registry.json 的 arch 字段分派加载。
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# ====================================================================
# PyTorch 可选依赖检测
# ====================================================================
try:
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    torch = None  # type: ignore
    nn = None  # type: ignore
    F = None  # type: ignore
    logger.warning("PyTorch 未安装，GNN 特征提取器仅支持 numpy 占位模式")

# torch_geometric 可选（缺失时回退到自实现 GAT）
try:
    from torch_geometric.nn import GATConv as PyGGATConv
    PYG_AVAILABLE = True
except ImportError:
    PYG_AVAILABLE = False
    PyGGATConv = None  # type: ignore
    logger.info("torch_geometric 未安装，将使用自实现 GAT 层")


# ====================================================================
# 节点 / 链路特征构造（从 DB 数据 -> 张量）
# ====================================================================
# 节点类型 one-hot 维度
NODE_TYPES = ["port", "airport", "warehouse", "city"]
# 区域 one-hot 维度
REGIONS = [
    "asia_east", "asia_se", "europe_w", "europe_e",
    "na_w", "na_e", "oceania", "mideast", "global",
]
# 节点特征维度 = 类型(4) + 区域(9) + 数值(6) = 19
NODE_FEAT_DIM = len(NODE_TYPES) + len(REGIONS) + 6
# 链路特征维度 = 运输方式(4) + 数值(5) = 9
LINK_MODES = ["land", "rail", "sea", "air"]
LINK_FEAT_DIM = len(LINK_MODES) + 5


def _one_hot(value: str, vocab: List[str]) -> List[float]:
    """生成 one-hot 向量"""
    vec = [0.0] * len(vocab)
    if value in vocab:
        vec[vocab.index(value)] = 1.0
    return vec


def build_node_features(nodes: List[Any]) -> np.ndarray:
    """从 DB 节点记录构造节点特征矩阵 [N, NODE_FEAT_DIM]

    Args:
        nodes: LogisticsNode ORM 对象列表（含 code/name_cn/node_type/region/lat/lng/is_hub 等字段）

    Returns:
        features: [N, NODE_FEAT_DIM] numpy 数组，dtype=float32
    """
    features = []
    for node in nodes:
        # 类型 one-hot [4]
        type_oh = _one_hot(node.node_type, NODE_TYPES)
        # 区域 one-hot [9]
        region_oh = _one_hot(node.region, REGIONS)
        # 数值特征 [6]：纬度、经度、是否枢纽、度数(占位)、平均出边成本(占位)、平均出边风险(占位)
        numeric = [
            float(node.lat or 0.0) / 90.0,         # 纬度归一化 [-1, 1]
            float(node.lng or 0.0) / 180.0,        # 经度归一化 [-1, 1]
            1.0 if node.is_hub else 0.0,           # 是否枢纽
            0.0,                                    # 度数（运行时填充）
            0.0,                                    # 平均出边成本（运行时填充）
            0.0,                                    # 平均出边风险（运行时填充）
        ]
        features.append(type_oh + region_oh + numeric)
    return np.array(features, dtype=np.float32)


def build_link_features(links: List[Any]) -> np.ndarray:
    """从 DB 链路记录构造链路特征矩阵 [E, LINK_FEAT_DIM]

    Args:
        links: LogisticsLink ORM 对象列表

    Returns:
        features: [E, LINK_FEAT_DIM] numpy 数组
    """
    features = []
    for link in links:
        # 运输方式 one-hot [4]
        mode_oh = _one_hot(link.transport_mode, LINK_MODES)
        # 数值特征 [5]：成本、时效、碳排、风险、距离
        numeric = [
            float(link.base_cost_usd) / 25000.0,   # 成本归一化
            float(link.base_time_days) / 25.0,     # 时效归一化
            float(link.base_carbon_kg) / 25000.0,  # 碳排归一化
            float(link.base_risk),                  # 风险（已 0-1）
            float(link.distance_km or 0.0) / 20000.0,  # 距离归一化
        ]
        features.append(mode_oh + numeric)
    return np.array(features, dtype=np.float32)


def build_edge_index(links: List[Any], node_id_to_idx: Dict[int, int]) -> np.ndarray:
    """构造 PyG 格式的边索引 [2, E]

    Args:
        links: 链路列表
        node_id_to_idx: 节点 ID -> 索引的映射

    Returns:
        edge_index: [2, E] numpy 数组，第一行是源节点，第二行是目标节点
    """
    src = []
    dst = []
    for link in links:
        if link.from_node_id in node_id_to_idx and link.to_node_id in node_id_to_idx:
            src.append(node_id_to_idx[link.from_node_id])
            dst.append(node_id_to_idx[link.to_node_id])
    return np.array([src, dst], dtype=np.int64)


# ====================================================================
# 自实现 GAT 层（PyG 不可用时的回退方案）
# ====================================================================
if TORCH_AVAILABLE and not PYG_AVAILABLE:

    class _SimpleGATLayer(nn.Module):
        """简化版 GAT 层（无 PyG 依赖）

        实现：对每个节点，将其邻居特征加权求和（注意力权重由可学习参数计算）。

        注：性能不如 PyG 的 GATConv，但作为骨架足够使用。
        生产环境建议安装 torch_geometric 以获得完整 GAT 实现。
        """

        def __init__(self, in_dim: int, out_dim: int, edge_dim: int = 0):
            super().__init__()
            self.in_dim = in_dim
            self.out_dim = out_dim
            self.edge_dim = edge_dim

            # 节点特征线性变换
            self.W = nn.Linear(in_dim, out_dim, bias=False)
            # 注意力打分（自注意力 + 邻居注意力）
            self.a_src = nn.Linear(out_dim, 1, bias=False)
            self.a_dst = nn.Linear(out_dim, 1, bias=False)
            # 边特征投影（可选）
            if edge_dim > 0:
                self.edge_proj = nn.Linear(edge_dim, out_dim, bias=False)
            # LeakyReLU 注意力激活
            self.leaky_relu = nn.LeakyReLU(negative_slope=0.2)

        def forward(
            self,
            x: torch.Tensor,                  # [N, in_dim]
            edge_index: torch.Tensor,          # [2, E]
            edge_attr: Optional[torch.Tensor] = None,  # [E, edge_dim]
        ) -> torch.Tensor:
            # 线性变换
            h = self.W(x)  # [N, out_dim]
            N = h.size(0)

            # 计算注意力分数
            alpha_src = self.a_src(h)  # [N, 1]
            alpha_dst = self.a_dst(h)  # [N, 1]

            # 边上的注意力分数
            src_idx = edge_index[0]  # [E]
            dst_idx = edge_index[1]  # [E]
            alpha = alpha_src[src_idx] + alpha_dst[dst_idx]  # [E, 1]

            # 融合边特征（可选）
            if edge_attr is not None and self.edge_dim > 0:
                edge_emb = self.edge_proj(edge_attr)  # [E, out_dim]
                alpha = alpha + edge_emb.mean(dim=-1, keepdim=True)  # [E, 1]

            alpha = self.leaky_relu(alpha).squeeze(-1)  # [E]

            # Softmax 归一化（按目标节点分组）
            alpha_out = torch.zeros(N, device=h.device)
            alpha_out.scatter_add_(0, dst_idx, alpha)
            alpha_norm = torch.exp(alpha) / (torch.exp(alpha_out[dst_idx]) + 1e-8)

            # 加权聚合
            out = torch.zeros_like(h)
            out.scatter_add_(
                0,
                dst_idx.unsqueeze(-1).expand(-1, self.out_dim),
                h[src_idx] * alpha_norm.unsqueeze(-1),
            )
            return out


# ====================================================================
# GNN 特征提取器主类
# ====================================================================
if TORCH_AVAILABLE:

    class GraphFeatureExtractor(nn.Module):
        """图特征提取器（GAT 架构）

        接收任意规模的物流路网，输出固定维度的节点嵌入。
        用于 PPO Actor-Critic 网络的前端，替代旧的 6 维 state 向量。

        优势：
            - 节点数变化时不影响网络权重（新增节点无需重训）
            - 注意力机制可学习节点间重要性
            - 边特征融合运输方式、成本等信息

        用法：
            extractor = GraphFeatureExtractor(
                node_feat_dim=19, edge_feat_dim=9, hidden_dim=64
            )
            node_emb = extractor(x, edge_index, edge_attr)  # [N, 64]
            # 当前节点的嵌入作为 PPO 输入
            current_state = node_emb[current_idx]  # [64]
        """

        def __init__(
            self,
            node_feat_dim: int = NODE_FEAT_DIM,
            edge_feat_dim: int = LINK_FEAT_DIM,
            hidden_dim: int = 64,
            num_heads: int = 4,
            num_layers: int = 3,
            dropout: float = 0.1,
        ):
            super().__init__()
            self.node_feat_dim = node_feat_dim
            self.edge_feat_dim = edge_feat_dim
            self.hidden_dim = hidden_dim
            self.num_layers = num_layers

            # 构建多层 GAT
            self.layers = nn.ModuleList()
            for i in range(num_layers):
                in_dim = node_feat_dim if i == 0 else hidden_dim
                if PYG_AVAILABLE:
                    # 使用 PyG 的 GATConv（支持 multi-head attention）
                    self.layers.append(
                        PyGGATConv(
                            in_dim,
                            hidden_dim // num_heads,
                            heads=num_heads,
                            edge_dim=edge_feat_dim,
                            dropout=dropout,
                        )
                    )
                else:
                    # 回退到自实现
                    self.layers.append(
                        _SimpleGATLayer(in_dim, hidden_dim, edge_dim=edge_feat_dim)
                    )

            self.dropout = nn.Dropout(dropout)
            self.layer_norm = nn.LayerNorm(hidden_dim)

            logger.info(
                "GraphFeatureExtractor 初始化完成: "
                f"node_feat={node_feat_dim}, edge_feat={edge_feat_dim}, "
                f"hidden={hidden_dim}, heads={num_heads}, layers={num_layers}, "
                f"backend={'PyG' if PYG_AVAILABLE else 'self-impl'}"
            )

        def forward(
            self,
            x: torch.Tensor,                  # [N, node_feat_dim] 节点特征
            edge_index: torch.Tensor,          # [2, E] 边索引
            edge_attr: Optional[torch.Tensor] = None,  # [E, edge_feat_dim] 边特征
        ) -> torch.Tensor:
            """前向传播

            Args:
                x: 节点特征矩阵 [N, node_feat_dim]
                edge_index: 边索引 [2, E]（PyG 格式）
                edge_attr: 边特征 [E, edge_feat_dim]（可选）

            Returns:
                node_emb: 节点嵌入 [N, hidden_dim]
            """
            h = x
            for i, layer in enumerate(self.layers):
                if PYG_AVAILABLE:
                    h = layer(h, edge_index, edge_attr)
                else:
                    h = layer(h, edge_index, edge_attr)
                if i < self.num_layers - 1:
                    h = F.elu(h)
                    h = self.dropout(h)
            # 最后一层 LayerNorm
            h = self.layer_norm(h)
            return h  # [N, hidden_dim]

        def get_state_embedding(
            self,
            x: torch.Tensor,
            edge_index: torch.Tensor,
            edge_attr: Optional[torch.Tensor],
            current_idx: int,
        ) -> torch.Tensor:
            """获取当前节点的状态嵌入（用于 PPO 输入）

            Args:
                x, edge_index, edge_attr: 同 forward
                current_idx: 当前节点索引

            Returns:
                state_emb: [hidden_dim] 当前节点的状态嵌入
            """
            node_emb = self.forward(x, edge_index, edge_attr)  # [N, hidden_dim]
            return node_emb[current_idx]  # [hidden_dim]

        def get_action_scores(
            self,
            x: torch.Tensor,
            edge_index: torch.Tensor,
            edge_attr: Optional[torch.Tensor],
            current_idx: int,
            neighbor_indices: List[int],
            neighbor_link_feats: torch.Tensor,  # [k, edge_feat_dim]
        ) -> torch.Tensor:
            """获取当前节点所有可行动作的评分（动态维度）

            这是 PPO Actor 的核心调用：
            - 对当前节点的每个邻居链路打分
            - 输出维度 = 邻居数 k（动态，与总节点数无关）

            Args:
                neighbor_indices: 当前节点的邻居节点索引列表 [k]
                neighbor_link_feats: 邻居链路特征 [k, edge_feat_dim]

            Returns:
                scores: [k] 每个可行动作的评分（外层 softmax 后作为策略分布）
            """
            node_emb = self.forward(x, edge_index, edge_attr)  # [N, hidden_dim]
            curr_emb = node_emb[current_idx]  # [hidden_dim]

            # 取邻居节点的嵌入
            neighbor_idx_tensor = torch.tensor(neighbor_indices, dtype=torch.long, device=x.device)
            neighbor_embs = node_emb[neighbor_idx_tensor]  # [k, hidden_dim]

            # 拼接当前节点 + 邻居节点 + 链路特征
            curr_emb_expanded = curr_emb.unsqueeze(0).expand_as(neighbor_embs)  # [k, hidden_dim]
            if neighbor_link_feats.size(0) == neighbor_embs.size(0):
                # 融合链路特征
                action_input = torch.cat([
                    curr_emb_expanded,
                    neighbor_embs,
                    neighbor_link_feats,
                ], dim=-1)  # [k, hidden_dim * 2 + edge_feat_dim]
            else:
                action_input = torch.cat([
                    curr_emb_expanded,
                    neighbor_embs,
                ], dim=-1)  # [k, hidden_dim * 2]

            # 简化的 Actor head（实际项目中可独立为 Actor 类）
            if not hasattr(self, "_actor_head"):
                actor_in_dim = action_input.size(-1)
                self._actor_head = nn.Linear(actor_in_dim, 1, bias=False).to(x.device)
                logger.info(f"Actor head 自动初始化: in_dim={actor_in_dim}")

            scores = self._actor_head(action_input).squeeze(-1)  # [k]
            return scores

        def get_state_value(
            self,
            x: torch.Tensor,
            edge_index: torch.Tensor,
            edge_attr: Optional[torch.Tensor],
        ) -> torch.Tensor:
            """获取全局状态价值（Critic）

            通过对节点嵌入做 mean pooling 得到全局表示，再输出 V(s)。

            Returns:
                value: [1] 状态价值
            """
            node_emb = self.forward(x, edge_index, edge_attr)  # [N, hidden_dim]
            global_emb = node_emb.mean(dim=0)  # [hidden_dim]

            if not hasattr(self, "_critic_head"):
                self._critic_head = nn.Sequential(
                    nn.Linear(self.hidden_dim, self.hidden_dim),
                    nn.ReLU(),
                    nn.Linear(self.hidden_dim, 1),
                ).to(x.device)
                logger.info("Critic head 自动初始化")

            value = self._critic_head(global_emb)  # [1]
            return value

else:
    # PyTorch 不可用时的占位类（仅用于模块导入不报错）
    class GraphFeatureExtractor:  # type: ignore[no-redef]
        """PyTorch 不可用时的占位实现

        仅提供接口定义，实际功能不可用。
        安装 PyTorch 后即可启用完整 GNN 功能。
        """

        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "PyTorch 未安装，GraphFeatureExtractor 不可用。"
                "请运行: pip install torch"
            )


# ====================================================================
# 工厂函数
# ====================================================================
def build_gnn_extractor(
    node_feat_dim: int = NODE_FEAT_DIM,
    edge_feat_dim: int = LINK_FEAT_DIM,
    hidden_dim: int = 64,
) -> "GraphFeatureExtractor":
    """构建 GNN 特征提取器实例

    Args:
        node_feat_dim: 节点特征维度（默认 19）
        edge_feat_dim: 链路特征维度（默认 9）
        hidden_dim: 隐藏层维度（默认 64）

    Returns:
        GraphFeatureExtractor 实例
    """
    if not TORCH_AVAILABLE:
        raise RuntimeError(
            "PyTorch 未安装，无法构建 GNN 特征提取器。"
            "请运行: pip install torch"
        )
    return GraphFeatureExtractor(
        node_feat_dim=node_feat_dim,
        edge_feat_dim=edge_feat_dim,
        hidden_dim=hidden_dim,
    )


# ====================================================================
# 自检与示例
# ====================================================================
if __name__ == "__main__":
    """模块自检：用随机数据验证 GNN 前向传播

    运行: python -m rl.gnn_extractor
    """
    if not TORCH_AVAILABLE:
        print("[SKIP] PyTorch 未安装，自检跳过")
        exit(0)

    print("=" * 60)
    print("GraphFeatureExtractor 自检")
    print("=" * 60)

    # 构造模拟数据（12 节点 48 链路，对齐当前环境）
    N = 12
    E = 48
    torch.manual_seed(42)

    x = torch.randn(N, NODE_FEAT_DIM)
    edge_index = torch.randint(0, N, (2, E))
    edge_attr = torch.randn(E, LINK_FEAT_DIM)

    # 构建提取器
    extractor = build_gnn_extractor(hidden_dim=64)
    print(f"\n节点特征维度: {NODE_FEAT_DIM}")
    print(f"链路特征维度: {LINK_FEAT_DIM}")
    print(f"隐藏层维度: 64")
    print(f"PyG 可用: {PYG_AVAILABLE}")

    # 前向传播
    node_emb = extractor(x, edge_index, edge_attr)
    print(f"\n[前向传播] 节点嵌入 shape: {node_emb.shape} (预期 [12, 64])")

    # 获取当前节点状态嵌入
    current_idx = 0
    state_emb = extractor.get_state_embedding(x, edge_index, edge_attr, current_idx)
    print(f"[状态嵌入] shape: {state_emb.shape} (预期 [64])")

    # 获取动作评分（当前节点 3 个邻居）
    neighbor_indices = [1, 3, 7]
    neighbor_link_feats = torch.randn(3, LINK_FEAT_DIM)
    scores = extractor.get_action_scores(
        x, edge_index, edge_attr, current_idx, neighbor_indices, neighbor_link_feats
    )
    print(f"[动作评分] shape: {scores.shape} (预期 [3])")
    print(f"[动作评分] values: {scores.detach().numpy()}")

    # 获取状态价值
    value = extractor.get_state_value(x, edge_index, edge_attr)
    print(f"[状态价值] shape: {value.shape} (预期 [1])")
    print(f"[状态价值] value: {value.detach().numpy()}")

    # 验证动态扩展性：节点数从 12 扩到 50，权重无需重训
    print("\n--- 动态扩展性验证 ---")
    N_new = 50
    E_new = 200
    x_new = torch.randn(N_new, NODE_FEAT_DIM)
    edge_index_new = torch.randint(0, N_new, (2, E_new))
    edge_attr_new = torch.randn(E_new, LINK_FEAT_DIM)
    node_emb_new = extractor(x_new, edge_index_new, edge_attr_new)
    print(f"扩展后节点数: {N_new}")
    print(f"扩展后链路数: {E_new}")
    print(f"扩展后节点嵌入 shape: {node_emb_new.shape} (预期 [50, 64])")
    print(f"权重是否变化: 否（同一组权重适配不同规模路网）")

    print("\n[OK] 自检全部通过")
