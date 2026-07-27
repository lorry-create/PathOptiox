"""PathOptix 鉴权与接口去 Mock 化自检脚本

覆盖三类验证：
  A. 鉴权拦截与哈希验证（用例 1-4）
  B. 响应格式一致性检查（用例 5）
  C. 500 异常日志捕获测试（用例 6，需配合临时注入 1/0）

使用方式：
    # 默认运行用例 1-5（鉴权 + 响应格式）
    python scripts/test_auth.py

    # 额外运行用例 6（500 日志捕获，需先在 optimize_route 注入 `1 / 0`）
    python scripts/test_auth.py --check-500

前置条件：
    1. 后端服务已启动（默认 http://localhost:8010）
    2. 数据库已初始化默认管理员 lorry / 123456
    3. venv 中已安装 httpx

退出码：
    0 - 全部用例通过
    1 - 存在失败用例
    2 - 后端未就绪
"""
from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path
from typing import Optional

try:
    import httpx
except ImportError:  # pragma: no cover
    print("[FATAL] 未安装 httpx，请在 venv 中执行: pip install httpx")
    sys.exit(2)


# ===== 配置 =====
BASE_URL = "http://localhost:8010"
ADMIN_USER = "lorry"
ADMIN_PWD = "123456"
TIMEOUT = 30.0
# 日志文件相对项目根目录：backend/logs/pathoptix.log
LOG_FILE = Path(__file__).resolve().parent.parent / "backend" / "logs" / "pathoptix.log"


# ===== 结果收集 =====
class CaseResult:
    """单个测试用例结果"""

    def __init__(self, no: str, name: str):
        self.no = no
        self.name = name
        self.passed: Optional[bool] = None
        self.expect = ""
        self.actual = ""
        self.hint = ""  # 失败时的修复建议

    def ok(self, actual: str = "") -> "CaseResult":
        self.passed = True
        self.actual = actual
        return self

    def fail(self, expect: str, actual: str, hint: str = "") -> "CaseResult":
        self.passed = False
        self.expect = expect
        self.actual = actual
        self.hint = hint
        return self


def wait_for_backend(timeout: int = 30) -> bool:
    """轮询健康检查接口，等待后端就绪"""
    deadline = time.time() + timeout
    with httpx.Client(timeout=5.0) as client:
        while time.time() < deadline:
            try:
                r = client.get(f"{BASE_URL}/")
                if r.status_code == 200:
                    return True
            except httpx.HTTPError:
                pass
            time.sleep(0.5)
    return False


# ===== 用例 1：明文密码登录换取 JWT =====
def case_1_login(client: httpx.Client) -> tuple[CaseResult, Optional[str]]:
    case = CaseResult("1", "明文密码登录换取 JWT（bcrypt 校验）")
    try:
        # 注意：登录接口接收 application/x-www-form-urlencoded 表单
        r = client.post(
            "/api/auth/login",
            data={"username": ADMIN_USER, "password": ADMIN_PWD},
        )
    except httpx.HTTPError as e:
        return case.fail("HTTP 200 + access_token", f"请求异常: {e}"), None

    if r.status_code != 200:
        return case.fail(
            "HTTP 200",
            f"HTTP {r.status_code} body={r.text[:200]}",
            "检查 auth_service.login 是否抛出异常、init_db 是否已 seed 默认管理员",
        ), None

    body = r.json()
    token = body.get("access_token")
    token_type = body.get("token_type")
    if not token or token_type != "bearer":
        return case.fail(
            "access_token 非空且 token_type=bearer",
            f"body={body}",
            "检查 auth_service.login 返回结构",
        ), None

    # JWT 简单格式校验：三段式 header.payload.signature
    parts = token.split(".")
    if len(parts) != 3:
        return case.fail(
            "JWT 三段式结构",
            f"token 分段数={len(parts)}",
            "检查 create_access_token 是否使用 jose.jwt.encode",
        ), None

    return case.ok(f"HTTP 200, token_type={token_type}, jwt 三段式 OK"), token


# ===== 用例 2：无 Token 访问受保护接口 → 401 =====
def case_2_no_token_401(client: httpx.Client) -> CaseResult:
    case = CaseResult("2", "无 Token 访问受保护接口 /api/orders → 401")
    try:
        r = client.get("/api/orders")
    except httpx.HTTPError as e:
        return case.fail("HTTP 401", f"请求异常: {e}")

    if r.status_code != 401:
        return case.fail(
            "HTTP 401（未携带 Token 应被拦截）",
            f"HTTP {r.status_code} body={r.text[:200]}",
            "检查 order.py 是否声明 router 级 Depends(get_current_user)",
        )

    # FastAPI OAuth2PasswordBearer 默认返回 {"detail": "Not authenticated"}
    body = r.json()
    if "detail" not in body:
        return case.fail(
            "响应含 detail 字段",
            f"body={body}",
            "检查 OAuth2PasswordBearer 是否生效",
        )

    return case.ok(f"HTTP 401, detail={body['detail']!r}")


# ===== 用例 3：错误密码 → 401（不泄露用户是否存在）=====
def case_3_wrong_password_401(client: httpx.Client) -> CaseResult:
    case = CaseResult("3", "错误密码登录 → 401（bcrypt 校验失败）")
    try:
        r = client.post(
            "/api/auth/login",
            data={"username": ADMIN_USER, "password": "this_is_a_wrong_pwd"},
        )
    except httpx.HTTPError as e:
        return case.fail("HTTP 401", f"请求异常: {e}")

    if r.status_code != 401:
        return case.fail(
            "HTTP 401（密码错误应拒绝）",
            f"HTTP {r.status_code} body={r.text[:200]}",
            "检查 verify_password 是否正确返回 False、auth_service.login 是否统一抛 401",
        )

    body = r.json()
    detail = body.get("detail", "")
    # 关键：错误信息不应泄露"用户不存在"还是"密码错误"
    if "不存在" in detail or "not found" in detail.lower():
        return case.fail(
            "detail 不应泄露用户是否存在",
            f"detail={detail!r}",
            "auth_service.login 应统一返回 '用户名或密码错误'",
        )

    return case.ok(f"HTTP 401, detail={detail!r}")


# ===== 用例 4：带 Token 访问受保护接口 → 200 =====
def case_4_valid_token_200(client: httpx.Client, token: str) -> CaseResult:
    case = CaseResult("4", "携带 JWT 访问 /api/orders → 200")
    try:
        r = client.get(
            "/api/orders",
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as e:
        return case.fail("HTTP 200", f"请求异常: {e}")

    if r.status_code != 200:
        return case.fail(
            "HTTP 200（合法 Token 应放行）",
            f"HTTP {r.status_code} body={r.text[:200]}",
            "检查 get_current_user 解析 JWT 是否成功、token 是否过期",
        )

    body = r.json()
    # OrderListResponse 结构：{orders: [...], total: int}
    if "orders" not in body or "total" not in body:
        return case.fail(
            "OrderListResponse {orders, total}",
            f"body keys={list(body.keys())}",
            "检查 order_service.list_orders 返回结构",
        )

    return case.ok(f"HTTP 200, orders count={body['total']}")


# ===== 用例 5：/api/optimize/route 响应格式一致性 =====
def case_5_optimize_response_format(client: httpx.Client, token: str) -> CaseResult:
    case = CaseResult("5", "/api/optimize/route 返回扁平 Pydantic 对象（非 {code,msg,data}）")
    payload = {
        "start_node": "shenzhen",
        "end_node": "rotterdam",
        "weight_cost": 0.3,
        "weight_time": 0.3,
        "weight_carbon": 0.4,
    }
    try:
        r = client.post(
            "/api/optimize/route",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as e:
        return case.fail("HTTP 200 + 扁平结构", f"请求异常: {e}")

    if r.status_code != 200:
        return case.fail(
            "HTTP 200",
            f"HTTP {r.status_code} body={r.text[:300]}",
            "接口本身异常，先排查 optimization_service.optimize 是否报错",
        )

    body = r.json()
    keys = set(body.keys())
    # 旧 Mock 包装结构
    mock_keys = {"code", "msg", "data"}
    is_mock_wrapped = mock_keys.issubset(keys)

    # OptimizeResponse Schema 期望字段
    expected_flat_keys = {"schemes", "explanation"}

    if is_mock_wrapped:
        return case.fail(
            f"扁平对象含 {expected_flat_keys}",
            f"仍返回 Mock 包装 keys={sorted(keys & mock_keys)}",
            "修改 api/v1/optimization.py：直接 return resp（OptimizeResponse），"
            "移除 {code,msg,data} 包装；并同步前端 RouteOptimizationView.tsx 取数路径",
        )

    if not expected_flat_keys.issubset(keys):
        return case.fail(
            f"扁平对象含 {expected_flat_keys}",
            f"keys={sorted(keys)}",
            "确认响应是否与 schemas/optimization.py::OptimizeResponse 一致",
        )

    return case.ok(f"HTTP 200, 扁平结构 keys={sorted(keys)}")


# ===== 用例 6：500 异常日志捕获（需先在 optimize_route 注入 1/0）=====
def case_6_500_logging(client: httpx.Client, token: str) -> CaseResult:
    case = CaseResult("6", "500 异常 → 控制台/日志文件含完整 Traceback")
    payload = {
        "start_node": "shenzhen",
        "end_node": "rotterdam",
        "weight_cost": 0.3,
        "weight_time": 0.3,
        "weight_carbon": 0.4,
    }
    try:
        r = client.post(
            "/api/optimize/route",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
        )
    except httpx.HTTPError as e:
        return case.fail("HTTP 500 + 日志含 Traceback", f"请求异常: {e}")

    if r.status_code != 500:
        return case.fail(
            "HTTP 500（注入的 1/0 应触发 500）",
            f"HTTP {r.status_code} body={r.text[:200]}",
            "确认是否已在 optimize_route 函数体首行注入 `1 / 0`",
        )

    body = r.json()
    if body.get("detail") != "服务器内部错误，请稍后重试":
        return case.fail(
            "detail='服务器内部错误，请稍后重试'",
            f"body={body}",
            "检查 exceptions.general_exception_handler 是否返回通用提示",
        )

    # 读取日志文件，查找 Traceback + ZeroDivisionError
    if not LOG_FILE.exists():
        return case.fail(
            f"日志文件存在: {LOG_FILE}",
            "日志文件不存在",
            "检查 logging_config.setup_logging 是否在 main.py 启动时调用、工作目录是否为 backend/",
        )

    try:
        log_text = LOG_FILE.read_text(encoding="utf-8", errors="ignore")
    except OSError as e:
        return case.fail("日志文件可读", f"读取失败: {e}")

    # 取最后 8000 字符足以覆盖本次异常
    tail = log_text[-8000:]
    has_traceback = "Traceback (most recent call last)" in tail
    has_zero_div = "ZeroDivisionError" in tail

    if not (has_traceback and has_zero_div):
        return case.fail(
            "日志含 'Traceback' 与 'ZeroDivisionError'",
            f"Traceback={has_traceback}, ZeroDivisionError={has_zero_div}",
            "检查 exceptions.py 是否调用 logger.exception（非 logger.error），"
            "及 pathoptix logger 是否同时输出到 console + file",
        )

    return case.ok(
        f"HTTP 500, 日志含 Traceback + ZeroDivisionError (file={LOG_FILE.name})"
    )


# ===== 汇总打印 =====
def print_report(results: list[CaseResult]) -> int:
    print("\n" + "=" * 78)
    print("PathOptix 鉴权 & 接口去 Mock 化 自检报告")
    print("=" * 78)
    for r in results:
        tag = "[PASS]" if r.passed else "[FAIL]"
        print(f"{tag} 用例 {r.no}: {r.name}")
        print(f"       期望: {r.expect or '(无)'}")
        print(f"       实际: {r.actual}")
        if not r.passed and r.hint:
            print(f"       修复: {r.hint}")
    print("-" * 78)
    passed = sum(1 for r in results if r.passed)
    total = len(results)
    print(f"汇总: {passed}/{total} 通过")
    print("=" * 78)
    return 0 if passed == total else 1


def main() -> int:
    global BASE_URL

    parser = argparse.ArgumentParser(description="PathOptix 鉴权自检脚本")
    parser.add_argument(
        "--check-500",
        action="store_true",
        help="额外运行用例 6（500 日志捕获，需先在 optimize_route 注入 1/0）",
    )
    parser.add_argument("--base-url", default=BASE_URL, help="后端基础 URL")
    args = parser.parse_args()

    BASE_URL = args.base_url.rstrip("/")

    print(f"[INFO] 等待后端就绪: {BASE_URL} ...")
    if not wait_for_backend():
        print(f"[FATAL] 后端 {BASE_URL} 在 30s 内未就绪，请先启动 backend/main.py")
        return 2
    print("[INFO] 后端已就绪，开始执行用例 ...\n")

    results: list[CaseResult] = []

    with httpx.Client(base_url=BASE_URL, timeout=TIMEOUT) as client:
        # 用例 1：登录拿 token
        r1, token = case_1_login(client)
        results.append(r1)

        # 用例 2：无 Token → 401
        results.append(case_2_no_token_401(client))

        # 用例 3：错误密码 → 401
        results.append(case_3_wrong_password_401(client))

        # 用例 4：带 Token → 200
        if token:
            results.append(case_4_valid_token_200(client, token))
        else:
            skip = CaseResult("4", "携带 JWT 访问 /api/orders → 200")
            skip.fail("HTTP 200", "跳过：用例 1 未拿到 token")
            results.append(skip)

        # 用例 5：响应格式一致性
        if token:
            results.append(case_5_optimize_response_format(client, token))
        else:
            skip = CaseResult("5", "/api/optimize/route 响应格式一致性")
            skip.fail("扁平结构", "跳过：用例 1 未拿到 token")
            results.append(skip)

        # 用例 6：500 日志捕获（可选）
        if args.check_500:
            if token:
                results.append(case_6_500_logging(client, token))
            else:
                skip = CaseResult("6", "500 异常日志捕获")
                skip.fail("HTTP 500 + Traceback", "跳过：用例 1 未拿到 token")
                results.append(skip)

    return print_report(results)


if __name__ == "__main__":
    sys.exit(main())