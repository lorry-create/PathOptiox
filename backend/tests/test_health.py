"""健康检查测试：验证 FastAPI 应用启动正常"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestHealth:
    """健康检查端点测试"""

    def test_root_returns_ok(self, client: TestClient):
        """GET / 应返回 200 和版本信息"""
        resp = client.get("/")
        assert resp.status_code == 200
        body = resp.json()
        assert body["message"] == "PathOptix API is running"
        assert "version" in body

    def test_docs_accessible(self, client: TestClient):
        """GET /docs 应返回 Swagger UI（200）"""
        resp = client.get("/docs")
        assert resp.status_code == 200

    def test_openapi_schema_accessible(self, client: TestClient):
        """GET /openapi.json 应返回 OpenAPI schema"""
        resp = client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "PathOptix API"
        assert "/api/orders" in schema["paths"]
