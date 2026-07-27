"""碳排放模块 API 集成测试

覆盖 S2-T07 碳排放数据真实化：
- GET /api/carbon/overview：总览指标（基于订单聚合）
- GET /api/carbon/trend：趋势数据（按时间维度和运输模态）
- GET /api/carbon/nodes：节点碳排放排行

这些接口应基于数据库订单数据计算，不返回 mock 数据。
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestCarbonAPI:
    """碳排放 API 集成测试"""

    def test_overview_returns_200(self, client: TestClient):
        """GET /api/carbon/overview 应返回 200"""
        resp = client.get("/api/carbon/overview")
        assert resp.status_code == 200
        body = resp.json()
        assert "total_emission_kg" in body
        assert "green_rate" in body
        assert "energy_consumption_kwh" in body

    def test_overview_emission_is_numeric(self, client: TestClient):
        """总碳排放应为数值（非 mock 字符串）"""
        resp = client.get("/api/carbon/overview")
        total = resp.json()["total_emission_kg"]
        assert isinstance(total, (int, float))
        assert total >= 0

    def test_trend_returns_200(self, client: TestClient):
        """GET /api/carbon/trend 应返回 200 和时间序列"""
        resp = client.get("/api/carbon/trend")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)

    def test_trend_with_time_range(self, client: TestClient):
        """GET /api/carbon/trend?time_range=week 应返回周维度数据"""
        resp = client.get("/api/carbon/trend", params={"time_range": "week"})
        assert resp.status_code == 200

    def test_trend_with_transport_mode(self, client: TestClient):
        """GET /api/carbon/trend?transport_mode=sea 应返回海运维度数据"""
        resp = client.get("/api/carbon/trend", params={"transport_mode": "sea"})
        assert resp.status_code == 200

    def test_nodes_returns_200(self, client: TestClient):
        """GET /api/carbon/nodes 应返回 200 和节点列表"""
        resp = client.get("/api/carbon/nodes")
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
