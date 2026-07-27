"""仪表盘模块 API 集成测试

覆盖 S3-T05 异步 Worker 真实实现：
- GET /api/dashboard/overview：全局概览（指标卡 + 智能体负载 + 全局状态）
- POST /api/dashboard/global-optimize：全局重调度（启动真实 asyncio Worker）
- GET /api/tasks/{task_id}：任务进度查询

重点验证 global_optimize 启动的 Worker 真实推进进度。
"""
import asyncio
import time

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestDashboardAPI:
    """仪表盘 API 集成测试"""

    def test_overview_returns_200(self, client: TestClient):
        """GET /api/dashboard/overview 应返回 200 和完整概览"""
        resp = client.get("/api/dashboard/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert "metrics" in body
        assert "agent_load" in body
        assert "global_status" in body

    def test_overview_metrics_has_required_fields(self, client: TestClient):
        """指标卡应包含 active_orders / on_time_rate / risk_count 等字段"""
        resp = client.get("/api/dashboard/overview")
        metrics = resp.json()["metrics"]
        for key in ["active_orders", "on_time_rate", "risk_count", "total_emission_kg"]:
            assert key in metrics, f"缺少指标：{key}"

    def test_overview_agent_load_is_list(self, client: TestClient):
        """智能体负载应为列表"""
        resp = client.get("/api/dashboard/overview")
        agent_load = resp.json()["agent_load"]
        assert isinstance(agent_load, list)
        assert len(agent_load) > 0
        # 每个智能体应包含 agent_id / name / load / status
        agent = agent_load[0]
        assert "agent_id" in agent
        assert "name" in agent
        assert "load" in agent

    def test_global_optimize_returns_task_id(self, client: TestClient):
        """POST /api/dashboard/global-optimize 应返回 task_id"""
        resp = client.post("/api/dashboard/global-optimize")
        assert resp.status_code == 200
        body = resp.json()
        assert "task_id" in body
        assert len(body["task_id"]) > 0

    def test_global_optimize_task_progress_increases(self, client: TestClient):
        """S3-T05：global-optimize 启动后，任务进度应随时间真实增长

        Worker 每 0.5s 推进 ~8.3%（1/12 步），等待 1s 后进度应 > 0。
        """
        # 创建任务
        resp = client.post("/api/dashboard/global-optimize")
        task_id = resp.json()["task_id"]

        # 立即查询：进度应为 0 或很低
        first_resp = client.get(f"/api/tasks/{task_id}")
        assert first_resp.status_code == 200
        first_progress = first_resp.json()["progress"]
        assert first_progress >= 0.0

        # 等待 1.5s 让 Worker 推进 3 步（~25%）
        time.sleep(1.5)
        second_resp = client.get(f"/api/tasks/{task_id}")
        second_progress = second_resp.json()["progress"]
        # 进度应大于初始值（Worker 在真实推进）
        assert second_progress > first_progress

    def test_global_optimize_task_completes(self, client: TestClient):
        """S3-T05：global-optimize 任务应在 8s 内完成（12 步 × 0.5s）"""
        resp = client.post("/api/dashboard/global-optimize")
        task_id = resp.json()["task_id"]

        # 等待 8s 让 Worker 完成
        time.sleep(8)
        final_resp = client.get(f"/api/tasks/{task_id}")
        body = final_resp.json()
        assert body["progress"] == 1.0
        assert body["status"] == "success"
        assert body["result"] is not None
        # 结果应包含真实聚合数据
        result = body["result"]
        assert "active_orders" in result
        assert "estimated_cost_savings" in result
