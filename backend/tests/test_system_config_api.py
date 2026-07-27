"""系统配置模块 API 集成测试

覆盖 S2-T06 系统设置持久化：
- GET /api/system/config：返回 SystemConfigResponse（configs 字典 + items 列表）
- PUT /api/system/config：批量更新，返回 SystemConfigUpdateResponse（success + updated_keys）

测试会修改配置值，测试结束后恢复原值，保证幂等。
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestSystemConfigAPI:
    """系统配置 API 集成测试"""

    def test_get_config_returns_200(self, client: TestClient):
        """GET /api/system/config 应返回 200 和配置字典"""
        resp = client.get("/api/system/config")
        assert resp.status_code == 200
        body = resp.json()
        assert "configs" in body
        assert isinstance(body["configs"], dict)

    def test_get_config_has_default_keys(self, client: TestClient):
        """应包含 init_db.seed_defaults 注入的默认配置键"""
        resp = client.get("/api/system/config")
        configs = resp.json()["configs"]
        # 这些是 system_config_service.seed_defaults 中的默认键
        expected_keys = [
            "green_mode_enabled",
            "alert_threshold_delay_hours",
            "alert_threshold_congestion_pct",
        ]
        for key in expected_keys:
            assert key in configs, f"缺少默认配置键：{key}"

    def test_update_config_persists(self, client: TestClient):
        """PUT /api/system/config 应持久化更新并返回 success=True"""
        # 读取原值
        resp = client.get("/api/system/config")
        original = resp.json()["configs"].get("alert_threshold_delay_hours", "45")

        # 更新为新值
        new_value = "99"
        put_resp = client.put(
            "/api/system/config",
            json={"configs": {"alert_threshold_delay_hours": new_value}},
        )
        assert put_resp.status_code == 200
        put_body = put_resp.json()
        assert put_body["success"] is True
        assert "alert_threshold_delay_hours" in put_body["updated_keys"]

        # 再次读取验证持久化
        verify_resp = client.get("/api/system/config")
        assert verify_resp.json()["configs"]["alert_threshold_delay_hours"] == new_value

        # 恢复原值
        client.put(
            "/api/system/config",
            json={"configs": {"alert_threshold_delay_hours": original}},
        )

    def test_update_multiple_keys(self, client: TestClient):
        """PUT 应支持一次更新多个配置键"""
        resp = client.get("/api/system/config")
        orig_energy = resp.json()["configs"].get("scheduling_weight_energy", "0.3")
        orig_latency = resp.json()["configs"].get("scheduling_weight_latency", "0.3")

        put_resp = client.put(
            "/api/system/config",
            json={
                "configs": {
                    "scheduling_weight_energy": "0.5",
                    "scheduling_weight_latency": "0.4",
                }
            },
        )
        assert put_resp.status_code == 200
        body = put_resp.json()
        assert body["success"] is True
        assert "scheduling_weight_energy" in body["updated_keys"]
        assert "scheduling_weight_latency" in body["updated_keys"]

        # 验证持久化
        verify = client.get("/api/system/config")
        assert verify.json()["configs"]["scheduling_weight_energy"] == "0.5"
        assert verify.json()["configs"]["scheduling_weight_latency"] == "0.4"

        # 恢复
        client.put(
            "/api/system/config",
            json={
                "configs": {
                    "scheduling_weight_energy": orig_energy,
                    "scheduling_weight_latency": orig_latency,
                }
            },
        )
