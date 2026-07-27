"""
xrl_workflow.py - 基于 LangGraph 的可解释性物流工作流
节点 1: RL 推断最优路径
节点 2: LLM 生成通俗中文解释报告

依赖策略：langchain / langgraph / stable_baselines3 等重型依赖全部在函数体内懒加载，
模块顶部只保留标准库与轻量依赖。这样在未安装这些包时仍可正常 import 本模块
（generate_explanation 调用失败会由上层 optimization_service 捕获并降级）。
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from typing_extensions import TypedDict

from app.config import settings

logger = logging.getLogger(__name__)


# ================================================================
# 状态定义
# ================================================================

class LogisticsState(TypedDict):
    # --- 输入 ---
    start_node: str
    end_node: str
    w1: float        # 成本权重
    w2: float        # 时间权重
    w3: float        # 碳排放权重

    # --- 中间 ---
    rl_path_json: dict[str, Any]

    # --- 输出 ---
    explanation_report: str


# ================================================================
# LLM 工厂（懒加载 langchain_openai）
# ================================================================

def _build_llm():
    """创建 DashScope ChatOpenAI 实例（qwen-turbo）。

    在函数体内 lazy import langchain_openai，缺失时抛 ImportError 由调用方处理。
    """
    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
        api_key=settings.DASHSCOPE_API_KEY,
        model="qwen-turbo",
        temperature=0.5,
        max_tokens=600,
    )


# ================================================================
# 节点 1: RL 推断
# ================================================================

def rl_node(state: LogisticsState) -> dict:
    """调用强化学习模型推断最优路径。"""
    from .train_agent import predict_route

    rl_result = predict_route(
        start_node_name=state["start_node"],
        end_node_name=state["end_node"],
        w1=state["w1"],
        w2=state["w2"],
        w3=state["w3"],
    )
    print(f"[rl_node] 路径推断完成: {' -> '.join(rl_result['route_nodes'])}")
    return {"rl_path_json": rl_result}


# ================================================================
# 节点 2: LLM 解释
# ================================================================

async def llm_node(state: LogisticsState) -> dict:
    """调用大模型，对 RL 推断路径生成通俗解释。"""
    from langchain_core.messages import HumanMessage, SystemMessage

    llm = _build_llm()

    path_text = json.dumps(state["rl_path_json"], ensure_ascii=False, indent=2)

    system_prompt = (
        "你是一个资深的国际物流规划师。"
        "AI算法刚刚计算出了一条最优路径：\n"
        f"{path_text}\n\n"
        f"客户目前的偏好权重是：成本={state['w1']}, 时效={state['w2']}, 碳排放={state['w3']}。\n"
        "请用专业且通俗的中文，向客户简要解释为什么推荐这条路径，以及在成本💰、时效⏱️、碳排放🌱上的综合考量。\n"
        "【输出要求】：字数控制在200~300字左右，必须使用emoji表情符号（如💰⏱️🌱✈️🚢🚛📊✅）让输出生动直观，不要写标题和分段，一段话说完。"
    )

    response = await llm.ainvoke([
        SystemMessage(content="你是一位资深国际物流规划师，擅长用通俗语言解释物流方案。回答简洁有条理，善用emoji表情，200~300字。"),
        HumanMessage(content=system_prompt),
    ])

    report = response.content
    print(f"[llm_node] 解释报告生成完成 ({len(report)} 字符)")
    return {"explanation_report": report}


# ================================================================
# 图编排 & 对外接口
# ================================================================

# 已编译工作流实例（懒构建：仅 run_logistics_pipeline 首次调用时才触发 langgraph import）
_app = None


def _get_app():
    """懒构建并缓存 LangGraph 工作流实例。"""
    global _app
    if _app is None:
        _app = _build_graph()
    return _app


def _build_graph():
    """构建并编译 LangGraph 工作流。"""
    from langgraph.graph import END, START, StateGraph

    graph = StateGraph(LogisticsState)
    graph.add_node("rl_node", rl_node)
    graph.add_node("llm_node", llm_node)
    graph.add_edge(START, "rl_node")
    graph.add_edge("rl_node", "llm_node")
    graph.add_edge("llm_node", END)
    return graph.compile()


async def run_logistics_pipeline(
    start_node: str = "shenzhen",
    end_node: str = "new_york",
    w1: float = 0.5,
    w2: float = 0.3,
    w3: float = 0.2,
) -> dict[str, Any]:
    """
    执行完整的物流推断 + 解释流水线（rl_node -> llm_node）。

    参数:
        start_node: 起点节点 ID
        end_node:   终点节点 ID
        w1:         成本权重
        w2:         时间权重
        w3:         碳排放权重

    返回:
        {
            "rl_path_json":        RL 推断的路径 JSON,
            "explanation_report":  LLM 生成的中文解释报告
        }
    """
    initial_state: LogisticsState = {
        "start_node": start_node,
        "end_node": end_node,
        "w1": w1,
        "w2": w2,
        "w3": w3,
        "rl_path_json": {},
        "explanation_report": "",
    }

    final_state = await _get_app().ainvoke(initial_state)

    return {
        "rl_path_json": final_state["rl_path_json"],
        "explanation_report": final_state["explanation_report"],
    }


# ================================================================
# 仅解释入口（供 optimization_service 复用，跳过 rl_node 避免重复 PPO 推理）
# ================================================================

# 四个必填字段，对齐 OptimizeExplanation schema
_REQUIRED_FIELDS = ("conclusion", "route_logic", "prediction_usage", "target_match")


async def generate_explanation(
    rl_path_json: dict[str, Any],
    w1: float,
    w2: float,
    w3: float,
) -> dict[str, str]:
    """
    只跑 LLM 解释节点，跳过 rl_node（避免与 optimization_service.optimize 已完成的
    PPO 推理重复）。把已算好的路径方案数据直接交给 Qwen，生成结构化四字段解释。

    参数:
        rl_path_json: 已计算好的路径方案数据（含 recommended_scheme / all_schemes_comparison 等）
        w1: 成本权重
        w2: 时间权重
        w3: 碳排放权重

    返回:
        {"conclusion": ..., "route_logic": ..., "prediction_usage": ..., "target_match": ...}

    异常:
        DASHSCOPE_API_KEY 缺失 / langchain 未安装 / LLM 调用失败 / JSON 解析失败时
        均抛异常，由调用方 catch 后回退到硬编码 _build_explanation。
    """
    if not settings.DASHSCOPE_API_KEY:
        raise ValueError("DASHSCOPE_API_KEY 未配置，无法调用 Qwen 生成可解释性报告")

    from langchain_core.messages import HumanMessage, SystemMessage

    llm = _build_llm()

    path_text = json.dumps(rl_path_json, ensure_ascii=False, indent=2)

    system_prompt = (
        "你是一位资深国际物流规划师。AI 算法刚基于多目标强化学习（PPO）在 12 节点 48 链路"
        "物流网络上计算出最优路径，并给出了 4 套候选方案的横向对比。请基于下方 JSON 数据，"
        "生成结构化的决策解释。\n\n"
        f"【方案数据 JSON】\n{path_text}\n\n"
        f"【客户偏好权重】成本={w1}、时效={w2}、碳排放={w3}\n\n"
        "【输出要求】必须且只能输出一个 JSON 对象，包含以下四个字段，每字段 50-80 字，"
        "使用 emoji（如💰⏱️🌱✈️🚢🚛📊✅）让表述生动，并引用 JSON 中的具体数字佐证：\n"
        '- "conclusion": 一句话结论，指出当前展示的方案及推荐理由\n'
        '- "route_logic": 路由逻辑，解释路径节点与运输方式组合在成本/时效/碳排/风险四维上的考量\n'
        '- "prediction_usage": 预测依据，结合场景与稳定性评分说明方案可靠性\n'
        '- "target_match": 目标匹配，说明方案如何匹配客户当前权重，并提示是否建议切换方案\n'
        "仅输出 JSON 本身，不要 markdown 围栏，不要任何额外说明文字。"
    )

    # 尝试启用 JSON mode（DashScope compatible-mode 对 qwen-turbo 支持 response_format）
    try:
        llm = llm.bind(response_format={"type": "json_object"})
    except Exception:
        logger.debug("response_format 绑定失败，退回普通调用")

    response = await llm.ainvoke([
        SystemMessage(
            content="你是一位资深国际物流规划师，擅长用通俗语言解释物流方案。"
            "严格按 JSON 格式输出，不要任何额外文字。"
        ),
        HumanMessage(content=system_prompt),
    ])

    content = response.content if isinstance(response.content, str) else str(response.content)

    # 兼容 ```json ``` 围栏与前后说明文字：提取首个 {...}
    match = re.search(r"\{.*\}", content, re.DOTALL)
    if not match:
        raise ValueError(f"LLM 输出未找到 JSON 块，原始内容前 200 字: {content[:200]}")

    try:
        data = json.loads(match.group(0))
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM 输出 JSON 解析失败: {e}；原始内容前 200 字: {content[:200]}")

    missing = [k for k in _REQUIRED_FIELDS if k not in data]
    if missing:
        raise ValueError(f"LLM 输出 JSON 缺少字段: {missing}")

    logger.info("generate_explanation 完成，四字段解释已生成")
    return {k: str(data[k]) for k in _REQUIRED_FIELDS}