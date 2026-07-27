"""训练优化模块业务服务层

接入真实 PPO 算法层，后台线程异步执行训练任务。
- 训练任务异步后台执行，运行时上下文保留内存（长耗时任务重启重置为合理行为）
- 训练历史、模型部署状态持久化到数据库
- 暂停/恢复/保存/部署操作全部对接真实算法与模型存储
- S2-T03: 移除 created_at_str，统一使用 BaseModel.created_at（DateTime），
          响应时格式化为 "YYYY-MM-DD HH:mm" 字符串
"""
import threading
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from schemas.enums import TrainingStatus
from schemas.training import (
    NetworkModelItem,
    TrainingDeployResponse,
    TrainingHistoryItem,
    TrainingSaveResponse,
    TrainingStartRequest,
    TrainingStartResponse,
    TrainingStatusResponse,
)
from services.task_manager import task_manager

from database import get_db_session
from models.training_history import TrainingHistory
from agent import LogisticsEnv, build_agent, get_backend, model_storage


# 训练默认配置
DEFAULT_TOTAL_EPISODES = 200
# 训练用起终点对（覆盖多种场景）
TRAIN_PAIRS = [
    ("北京", "深圳"),
    ("上海", "汉堡"),
    ("深圳", "洛杉矶"),
    ("广州", "伦敦"),
]


def _format_dt(dt) -> str:
    """将 datetime 对象格式化为 "YYYY-MM-DD HH:mm" 字符串（S2-T03）

    用于 TrainingHistoryItem.created_at 字段响应。
    兼容 None 和字符串输入。
    """
    if dt is None:
        return ""
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d %H:%M")
    return str(dt)


def _parse_dt(s: str) -> Optional[datetime]:
    """将字符串解析为 datetime 对象（S2-T03）

    支持格式：
    - "YYYY-MM-DD HH:mm"（16 字符）
    - "YYYY-MM-DD HH:mm:ss"（19 字符）
    - "YYYY-MM-DD"（10 字符）

    解析失败返回 None（调用方使用 BaseModel 默认值 datetime.utcnow）。
    """
    if not s or not isinstance(s, str):
        return None
    s = s.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _seed_network_models() -> List[NetworkModelItem]:
    return [
        NetworkModelItem(
            id="net_global_v3",
            name="全球物流网络 v3",
            description="覆盖 12 节点、48 链路的全球多式联运网络",
            created_at="2026-06-01",
        ),
        NetworkModelItem(
            id="net_asia_pacific",
            name="亚太区域网络",
            description="聚焦亚太节点的区域精细化网络",
            created_at="2026-05-15",
        ),
        NetworkModelItem(
            id="net_europe_express",
            name="欧洲快线网络",
            description="欧洲节点高时效网络模型",
            created_at="2026-04-20",
        ),
    ]


def _orm_to_item(orm: TrainingHistory) -> TrainingHistoryItem:
    """ORM 转 TrainingHistoryItem

    S2-T03: created_at 从 BaseModel.created_at（DateTime）格式化为 "YYYY-MM-DD HH:mm"。
    """
    return TrainingHistoryItem(
        model_id=orm.model_id,
        version_name=orm.version_name,
        created_at=_format_dt(orm.created_at),
        reward=orm.reward,
        status=orm.status,
    )


class TrainingService:
    """训练服务（接入真实 PPO 算法，历史持久化）"""

    def __init__(self) -> None:
        # 网络模型列表为静态配置，保留内存
        self._network_models: List[NetworkModelItem] = _seed_network_models()
        # task_id -> 训练运行时上下文（内存，重启重置）
        self._contexts: Dict[str, Dict[str, Any]] = {}
        # 训练线程句柄（内存）
        self._threads: Dict[str, threading.Thread] = {}
        self._lock = threading.Lock()

    # ============ 启动训练 ============
    def start(self, req: TrainingStartRequest) -> TrainingStartResponse:
        """创建训练任务，后台线程执行 PPO 训练，立即返回 task_id"""
        task_id = task_manager.create_task("training")
        ppo = req.ppo_params
        total_episodes = DEFAULT_TOTAL_EPISODES
        # 奖励权重
        weights = (
            float(ppo.reward_cost),
            float(ppo.reward_time),
            float(ppo.reward_carbon),
            float(ppo.reward_risk),
        )
        # 归一化权重（避免全 0）
        wsum = sum(weights)
        if wsum <= 0:
            weights = (0.25, 0.25, 0.25, 0.25)
        else:
            weights = tuple(w / wsum for w in weights)

        params_dict = {
            "learning_rate": ppo.learning_rate,
            "gamma": ppo.gamma,
            "gae_lambda": ppo.gae_lambda,
            "clip_epsilon": ppo.clip_epsilon,
            "entropy_coef": ppo.entropy_coef,
            "batch_size": ppo.batch_size,
            "epochs": ppo.epochs,
            "value_loss_coef": ppo.value_loss_coef,
            "use_dqn": ppo.use_dqn,
            "reward_cost": ppo.reward_cost,
            "reward_time": ppo.reward_time,
            "reward_carbon": ppo.reward_carbon,
            "reward_risk": ppo.reward_risk,
        }

        with self._lock:
            self._contexts[task_id] = {
                "total_episodes": total_episodes,
                "network_model": req.network_model,
                "params": params_dict,
                "weights": weights,
                "current_episode": 0,
                "reward": 0.0,
                "loss": 0.0,
                "logs": [
                    f"[Init] PPO 训练任务已创建，后端: {get_backend()}",
                    f"[Config] 总回合数={total_episodes}, 权重={weights}",
                    f"[Network] {req.network_model}",
                ],
                "agent": None,
                "finished": False,
                "last_reward": 0.0,
            }

        # 启动后台训练线程
        thread = threading.Thread(
            target=self._train_worker,
            args=(task_id, params_dict, weights, total_episodes),
            daemon=True,
            name=f"ppo-train-{task_id}",
        )
        self._threads[task_id] = thread
        thread.start()
        return TrainingStartResponse(task_id=task_id)

    def _train_worker(self, task_id: str, params: dict,
                      weights: tuple, total_episodes: int) -> None:
        """后台训练工作线程"""
        ctx = self._contexts.get(task_id)
        if ctx is None:
            return
        try:
            env = LogisticsEnv(scene="normal")
            agent = build_agent(env.max_action_dim, params)
            ctx["agent"] = agent

            def callback(ep: int, total: int, reward: float,
                         loss: float, logs: List[str]) -> None:
                # 直接读内部 dict 避免进度自动 +8%
                task_internal = task_manager._tasks.get(task_id, {})
                # 暂停时阻塞等待恢复
                while task_internal.get("status") == "paused":
                    time.sleep(0.5)
                    task_internal = task_manager._tasks.get(task_id, {})
                    if task_internal.get("status") in ("success", "failed"):
                        return
                # 更新上下文（累计回合数）
                cumulative_ep = ctx["_pair_base"] + ep
                ctx["current_episode"] = cumulative_ep
                ctx["reward"] = round(reward, 4)
                ctx["loss"] = round(loss, 6)
                ctx["logs"] = logs[-3:] if len(logs) > 3 else logs
                ctx["last_reward"] = reward
                # 更新任务进度（真实进度）
                progress = cumulative_ep / total
                task_manager.update_progress(task_id, progress)
                # 训练完成检测
                if cumulative_ep >= total:
                    ctx["finished"] = True

            # 在多个起终点对上训练（累计回合数）
            episodes_per_pair = max(1, total_episodes // len(TRAIN_PAIRS))
            total_run = 0
            ctx["_pair_base"] = 0
            for pair in TRAIN_PAIRS:
                if total_run >= total_episodes:
                    break
                start, end = pair
                remaining = total_episodes - total_run
                eps = min(episodes_per_pair, remaining)
                stats = agent.train(
                    env, eps, weights, start, end,
                    callback=callback,
                    total_episodes_for_progress=total_episodes,
                )
                run_eps = stats.get("episodes_run", eps)
                total_run += run_eps
                ctx["_pair_base"] = total_run

            # 训练完成
            ctx["finished"] = True
            ctx["logs"].append(f"[Done] 训练完成，最终 reward={ctx['reward']:.3f}")
            task_manager.finish_task(task_id, result={"reward": ctx["reward"]})

        except Exception as e:
            ctx["logs"].append(f"[Error] 训练失败: {e}")
            task_manager.fail_task(task_id, str(e))

    # ============ 查询状态 ============
    def status(self, task_id: str) -> TrainingStatusResponse:
        """查询训练状态（直接读内部状态，避免触发进度自动+8%）"""
        task = task_manager._tasks.get(task_id)
        if task is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="训练任务不存在")
        ctx = self._contexts.get(task_id, {})
        total_episodes = ctx.get("total_episodes", DEFAULT_TOTAL_EPISODES)
        current_episode = ctx.get("current_episode", 0)
        reward = ctx.get("reward", 0.0)
        loss = ctx.get("loss", 0.0)
        logs = ctx.get("logs", [])
        # 状态映射
        ts = task["status"]
        if ts == "running":
            status = TrainingStatus.running
        elif ts == "paused":
            status = TrainingStatus.paused
        elif ts == "failed":
            status = TrainingStatus.finished  # 失败也归为 finished
        else:
            status = TrainingStatus.finished
        progress = task["progress"]
        return TrainingStatusResponse(
            task_id=task_id,
            progress=round(progress, 4),
            current_episode=current_episode,
            total_episodes=total_episodes,
            reward=round(reward, 2),
            loss=round(loss, 4),
            status=status,
            logs=logs,
        )

    # ============ 暂停/恢复 ============
    def pause(self, task_id: str) -> dict:
        ok = task_manager.pause_task(task_id)
        if not ok:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="训练任务不存在")
        return {"task_id": task_id, "status": "paused"}

    def resume(self, task_id: str) -> dict:
        ok = task_manager.resume_task(task_id)
        if not ok:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="训练任务不存在")
        return {"task_id": task_id, "status": "running"}

    # ============ 保存模型 ============
    def save(self, task_id: str, version_name: str) -> TrainingSaveResponse:
        """保存当前训练的模型：写入文件存储 + 持久化历史记录到数据库"""
        ctx = self._contexts.get(task_id)
        if ctx is None or ctx.get("agent") is None:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="训练任务未就绪或不存在可保存的模型")
        agent = ctx["agent"]
        params = ctx.get("params", {})
        reward = ctx.get("last_reward", 0.0)
        # 1. 写入文件存储
        model_id = model_storage.save_model(
            agent, params=params, version_name=version_name, reward=reward
        )
        # 2. 持久化到数据库
        with get_db_session() as db:
            row = TrainingHistory(
                model_id=model_id,
                version_name=version_name,
                # S2-T03: created_at 由 BaseModel 默认值自动设置（datetime.utcnow）
                reward=round(reward, 2),
                status="saved",
            )
            db.add(row)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
        return TrainingSaveResponse(model_id=model_id)

    # ============ 部署模型 ============
    def deploy(self, task_id: str) -> TrainingDeployResponse:
        """部署指定任务最近保存的模型：更新文件存储 + 数据库状态"""
        success = False
        # 查找该任务最近保存的模型（从数据库读取）
        with get_db_session() as db:
            candidate = (
                db.query(TrainingHistory)
                .filter(
                    TrainingHistory.status == "saved",
                    TrainingHistory.is_deleted.is_(False),
                )
                .order_by(TrainingHistory.created_at.desc())
                .first()
            )
            if candidate is None:
                # 回退：尝试 saved/archived 状态
                candidate = (
                    db.query(TrainingHistory)
                    .filter(
                        TrainingHistory.status.in_(["saved", "archived"]),
                        TrainingHistory.is_deleted.is_(False),
                    )
                    .order_by(TrainingHistory.created_at.desc())
                    .first()
                )
            if candidate is not None:
                # 1. 更新文件存储
                ok = model_storage.deploy_model(candidate.model_id)
                if ok:
                    # 2. 更新数据库状态：当前模型置 deployed，原 deployed 置 archived
                    try:
                        # 原 deployed -> archived
                        db.query(TrainingHistory).filter(
                            TrainingHistory.status == "deployed",
                            TrainingHistory.is_deleted.is_(False),
                        ).update({TrainingHistory.status: "archived"})
                        # 当前 -> deployed
                        candidate.status = "deployed"
                        db.commit()
                        success = True
                    except Exception:
                        db.rollback()
                        raise
        return TrainingDeployResponse(success=success)

    # ============ 训练历史 ============
    def history(self) -> List[TrainingHistoryItem]:
        """返回训练历史列表（从数据库读取，同步 model_storage 中的模型）"""
        # 同步 model_storage 中的模型到数据库（首次启动或外部新增的模型）
        stored = model_storage.list_models()
        existing_ids = set()
        with get_db_session() as db:
            for row in db.query(TrainingHistory).filter(TrainingHistory.is_deleted.is_(False)).all():
                existing_ids.add(row.model_id)
            # 插入数据库中不存在的模型记录
            for m in stored:
                if m["model_id"] not in existing_ids:
                    # S2-T03: 从 model_storage 元数据解析 created_at（DateTime），
                    #        解析失败则不设置（由 BaseModel 默认值 utcnow 填充）
                    parsed_dt = _parse_dt(m.get("created_at", ""))
                    row_kwargs = dict(
                        model_id=m["model_id"],
                        version_name=m.get("version_name", m["model_id"]),
                        reward=float(m.get("reward", 0.0)),
                        status=m.get("status", "saved"),
                    )
                    if parsed_dt is not None:
                        row_kwargs["created_at"] = parsed_dt
                    new_row = TrainingHistory(**row_kwargs)
                    db.add(new_row)
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            # S2-T03: 按创建时间倒序返回（created_at 替代原 created_at_str）
            rows = (
                db.query(TrainingHistory)
                .filter(TrainingHistory.is_deleted.is_(False))
                .order_by(TrainingHistory.created_at.desc())
                .all()
            )
            return [_orm_to_item(r) for r in rows]

    # ============ 网络模型列表 ============
    def network_models(self) -> List[NetworkModelItem]:
        return self._network_models


training_service = TrainingService()
