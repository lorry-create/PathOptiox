"""训练优化模块路由

注意：/models 路径不属于 /training 前缀，单独导出 models_router 挂载到根。
"""
from typing import List

from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.training import (
    NetworkModelItem,
    TrainingControlResponse,
    TrainingDeployResponse,
    TrainingHistoryItem,
    TrainingSaveRequest,
    TrainingSaveResponse,
    TrainingStartRequest,
    TrainingStartResponse,
    TrainingStatusResponse,
)
from services.training_service import training_service


router = APIRouter(dependencies=[Depends(get_current_user)])
models_router = APIRouter(dependencies=[Depends(get_current_user)])


@router.post("/start", response_model=TrainingStartResponse, summary="启动训练")
def start_training(req: TrainingStartRequest):
    """接收完整训练参数，创建训练任务，返回 task_id"""
    return training_service.start(req)


@router.get("/{task_id}/status", response_model=TrainingStatusResponse, summary="查询训练状态")
def get_training_status(task_id: str):
    """查询训练状态，复用通用任务进度逻辑，补充 reward/loss/logs 字段"""
    return training_service.status(task_id)


@router.post("/{task_id}/pause", response_model=TrainingControlResponse, summary="暂停训练")
def pause_training(task_id: str):
    """暂停训练任务，进度停止增长"""
    return training_service.pause(task_id)


@router.post("/{task_id}/resume", response_model=TrainingControlResponse, summary="恢复训练")
def resume_training(task_id: str):
    """恢复训练任务，从暂停时进度继续累加"""
    return training_service.resume(task_id)


@router.post("/{task_id}/save", response_model=TrainingSaveResponse, summary="保存模型")
def save_model(task_id: str, req: TrainingSaveRequest):
    """保存模型，返回 model_id"""
    return training_service.save(task_id, req.version_name)


@router.post("/{task_id}/deploy", response_model=TrainingDeployResponse, summary="部署模型")
def deploy_model(task_id: str):
    """部署模型，标记为当前生效模型"""
    return training_service.deploy(task_id)


@router.get("/history", response_model=List[TrainingHistoryItem], summary="训练历史")
def get_history():
    """返回训练历史列表"""
    return training_service.history()


@models_router.get("/models", response_model=List[NetworkModelItem], summary="网络模型列表")
def get_network_models():
    """返回可用网络模型列表"""
    return training_service.network_models()
