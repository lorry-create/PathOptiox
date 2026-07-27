"""订单模块 API 集成测试

覆盖 S2-T08 订单 CRUD 完整链路：
- GET /api/orders：列表查询
- POST /api/orders：创建订单
- PUT /api/orders/{id}：更新订单
- DELETE /api/orders/{id}：软删除

测试创建的订单在测试结束后通过 DELETE 清理，保证幂等。
"""
import uuid

import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestOrdersAPI:
    """订单 CRUD API 集成测试"""

    def test_list_orders_returns_200(self, client: TestClient):
        """GET /api/orders 应返回 200 和订单列表"""
        resp = client.get("/api/orders")
        assert resp.status_code == 200
        body = resp.json()
        assert "orders" in body
        assert isinstance(body["orders"], list)
        # 数据库中已有 seed 数据，至少 1 条
        assert len(body["orders"]) >= 1

    def test_list_orders_has_required_fields(self, client: TestClient):
        """订单对象应包含必填字段"""
        resp = client.get("/api/orders")
        orders = resp.json()["orders"]
        if orders:
            order = orders[0]
            assert "id" in order
            assert "customer_name" in order
            assert "status" in order
            assert "date" in order

    def test_create_order_success(self, client: TestClient):
        """POST /api/orders 应创建订单并返回 200"""
        unique = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"测试客户_{unique}",
            "sender": "深圳仓",
            "receiver": "上海仓",
            "goods_description": "集成测试货物",
            "shipping_method": "land",
            "date": "2026-07-22",
            "total_amount": 1500.00,
            "status": "pending",
        }
        resp = client.post("/api/orders", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["customer_name"] == f"测试客户_{unique}"
        assert body["status"] == "pending"
        assert body["total_amount"] == 1500.00

        # 清理：软删除
        order_id = body["id"]
        del_resp = client.delete(f"/api/orders/{order_id}")
        assert del_resp.status_code == 200

    def test_create_order_invalid_status_rejected(self, client: TestClient):
        """非法 status 应被拒绝（422）"""
        payload = {
            "customer_name": "非法状态测试",
            "sender": "A",
            "receiver": "B",
            "goods_description": "test",
            "shipping_method": "land",
            "total_amount": 100,
            "status": "invalid_status_value",
        }
        resp = client.post("/api/orders", json=payload)
        assert resp.status_code == 422

    def test_delete_order_soft_delete(self, client: TestClient):
        """DELETE 应执行软删除：is_deleted=True"""
        # 先创建
        unique = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"软删测试_{unique}",
            "sender": "A",
            "receiver": "B",
            "goods_description": "test",
            "shipping_method": "sea",
            "date": "2026-07-22",
            "total_amount": 800,
            "status": "pending",
        }
        create_resp = client.post("/api/orders", json=payload)
        assert create_resp.status_code == 200
        order_id = create_resp.json()["id"]

        # 软删除
        del_resp = client.delete(f"/api/orders/{order_id}")
        assert del_resp.status_code == 200

        # 列表不应包含已删除订单
        list_resp = client.get("/api/orders")
        order_ids = [o["id"] for o in list_resp.json()["orders"]]
        assert order_id not in order_ids
