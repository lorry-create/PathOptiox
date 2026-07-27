# 修正文档剩余过时认证描述 + 新增 V1.3 版本变更记录

## Summary（摘要）

继续上一会话的「修复 bug」任务。经 Phase 1 探索确认：

- **代码层已完全修复**：`LoginView.tsx` 已移除背景图 404 请求；`auth.ts` 已清理 `getLoginBackground` 死代码；`axiosInstance.ts` 已使用真实 JWT（从 `localStorage` 读取 `access_token`，401 自动清除并派发 `auth:logout` 事件）。
- **文档已修正约 15 处**（L544 / L969 / L986 / L1325 / L1430 / L1506 / L1522-1529 / L1538 / L1614-1621），均已在本次探索中验证完成。
- **剩余 14 处过时描述** 仍需修正，分布在第 5/7/12/14/15/16/17/18 部分。
- **新增 V1.3 版本变更记录** 至第十八部分 18.1 文档版本历史表（L3852 之后）。

本计划仅修改 1 个文件：`项目开发文档V1.md`。所有修正均为描述性内容，不影响运行代码。

## Current State Analysis（当前状态分析）

### 代码层已验证为真实 JWT 认证（无需再动）

**`src/services/api/axiosInstance.ts`**（已读取确认）：
- L8: `const TOKEN_KEY = 'access_token';`
- L20-27: 请求拦截器从 `localStorage.getItem(TOKEN_KEY)` 读取并附加 `Authorization: Bearer ${token}`
- L44-53: 响应拦截器在 401 时（非 `/auth/login`）清除 token 并派发 `window.dispatchEvent(new CustomEvent('auth:logout'))`

**`src/components/features/auth/LoginView.tsx`**（已读取确认）：
- 已无 `bgUrl` state、`useEffect`、背景图 `<div>`，使用 CSS `network-gradient` 兜底
- 调用 `authApi.login` → 写入 `localStorage.setItem('access_token', response.access_token)`

**`src/services/modules/auth.ts`**（已读取确认）：
- 已无 `getLoginBackground` 方法

### 文档剩余待修正清单（14 处，按行号排序）

| # | 行号 | 章节 | 当前内容 | 修正方向 |
|---|------|------|----------|----------|
| 1 | L81 | 5.1 架构图 | `services/api/      axiosInstance (DEMO_TOKEN) + httpClient` | 改为 `axiosInstance (JWT 拦截器) + httpClient` |
| 2 | L88 | 5.1 架构图 | `Authorization: Bearer demo_admin_token_2026` | 改为 `Authorization: Bearer <JWT from localStorage>` |
| 3 | L244 | 6.1 目录结构 | `axiosInstance.ts      # baseURL + DEMO_TOKEN 拦截器` | 改为 `# baseURL + JWT 拦截器（localStorage 读取）` |
| 4 | L1082 | 8.x SSE 代码示例 | `Authorization: \`Bearer ${DEMO_TOKEN}\`` | 改为 `Authorization: \`Bearer ${token}\`  // token 从 localStorage 读取` |
| 5 | L1721 | 12.3 Risk-1 | `- **原因**：DEMO MODE 移除认证` | 改为 `- ~~原因~~：~~DEMO MODE 移除认证~~（V1.3 已解决：已实现真实 JWT 认证）` |
| 6 | L1788-1792 | 12.6 UX-1 | `#### UX-1：DEMO MODE 无登录流程` 整段 | 标题改为 `#### UX-1（V1.3 已解决）：DEMO MODE 无登录流程`，影响行加删除线并标注已解决 |
| 7 | L2012 | 14.1.1 表格 | `\| 鉴权 \| **DEMO MODE：无任何 \`Depends(get_current_active_user)\`** \| 全后端搜索零命中 \|` | 改为 `\| 鉴权 \| 真实 JWT：\`Depends(get_current_user)\` 强制校验（\`dependencies.py\`） \| \`dependencies.py:12\`、38 个受保护端点 \|` |
| 8 | L2093 | 14.2.1 登录返回示例 | `"access_token": "pathoptix_mock_token_2026"` | 改为 `"access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb3JyeSIsImV4cCI6...（真实 JWT）"` |
| 9 | L2100-2103 | 14.2.1 特殊行为 | `- 密码不校验...` / `- token 是固定字符串...` | 改为真实行为：bcrypt 校验、JWT 签发、1 小时过期 |
| 10 | L3345 | 15.x 错误处理表格 | `\| 前端 401 仅 \`console.warn\` 不跳转登录 \| P2 \| DEMO MODE 下可接受，生产化时需改 \|` | 改为 `\| ~~前端 401 仅 \`console.warn\` 不跳转登录~~ \| ~~P2~~ \| ~~V1.3 已解决：\`axiosInstance.ts:44-53\` 在 401 时清除 token 并派发 \`auth:logout\` 事件，\`App.tsx:56-63\` 切回登录视图~~ \|` |
| 11 | L3387 | 16.x 路径优化流程图 | `Authorization: Bearer demo_admin_token_2026  (注:与后端不匹配但不校验)` | 改为 `Authorization: Bearer <JWT>  (从 localStorage 读取，后端 get_current_user 校验)` |
| 12 | L3476 | 16.x 聊天流程图 | `headers: buildAuthHeaders(),  // Bearer demo_admin_token_2026` | 改为 `headers: buildAuthHeaders(),  // Bearer <JWT from localStorage>` |
| 13 | L3658 | 17.2.2 命名规范表格 | `\| 常量 \| UPPER_SNAKE \| \`DEMO_TOKEN\`、\`BASE_URL\` \|` | 改为 `\| 常量 \| UPPER_SNAKE \| \`TOKEN_KEY\`、\`BASE_URL\` \|` |
| 14 | L3837 | 17.8.2 生产化前置条件 | `1. 实现真实 JWT 认证（移除 DEMO MODE）` | 改为 `1. ~~实现真实 JWT 认证（移除 DEMO MODE）~~（V1.3 已完成）` |

### 新增 V1.3 版本变更记录

在 L3852（V1.2 行）之后插入新行：
```
| **V1.3** | **2026-07-19** | **认证描述校正：前端已重构为真实 JWT 认证（localStorage 存储 + axios 拦截器 + LoginView 登录页 + 401 自动跳转）；后端使用真实 JWT + bcrypt；删除 Bug-1（Token 不一致，已不存在）；修正约 30 处 DEMO MODE / 固定 token / 硬编码 token 的过时描述；修复 LoginView 背景图 404；扩展至约 30000 字** | **AI 架构师（运行时验证 + 文档校正）** |
```

## Proposed Changes（具体变更）

**唯一修改文件**：`d:\aaa大一资料\比赛资料\火山杯agent\PathOptiox-main\PathOptiox-main\项目开发文档V1.md`

### 变更 1：L81 架构图 services/api 描述
- 旧：`│  │ services/api/      axiosInstance (DEMO_TOKEN) + httpClient       │   │`
- 新：`│  │ services/api/      axiosInstance (JWT 拦截器) + httpClient        │   │`

### 变更 2：L88 架构图 Authorization 头
- 旧：`                                │  Authorization: Bearer demo_admin_token_2026`
- 新：`                                │  Authorization: Bearer <JWT from localStorage>`

### 变更 3：L244 目录结构注释
- 旧：`│   │   │   ├── axiosInstance.ts      # baseURL + DEMO_TOKEN 拦截器`
- 新：`│   │   │   ├── axiosInstance.ts      # baseURL + JWT 拦截器（localStorage 读取）`

### 变更 4：L1082 SSE 代码示例
- 旧：`  headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${DEMO_TOKEN}\` },`
- 新：`  headers: { 'Content-Type': 'application/json', Authorization: \`Bearer ${token}\` },  // token 从 localStorage 读取`
- 同时在代码块上方补一行注释说明 token 来源（若上下文不清晰）

### 变更 5：L1721 Risk-1 原因
- 旧：`- **原因**：DEMO MODE 移除认证`
- 新：`- ~~**原因**：DEMO MODE 移除认证~~（V1.3 已解决：已实现真实 JWT + bcrypt 认证，所有受保护端点均通过 \`Depends(get_current_user)\` 校验）`

### 变更 6：L1788-1792 UX-1 整段
- 旧标题：`#### UX-1：DEMO MODE 无登录流程`
- 新标题：`#### UX-1（V1.3 已解决）：DEMO MODE 无登录流程`
- L1790-1792 的影响/建议行加删除线并标注已解决：
  - `- **位置**：\`src/App.tsx\``（保留）
  - `- ~~**影响**：用户无法体验完整登录→退出流程~~（V1.3 已解决：已恢复完整 LoginView 登录页 + 401 自动登出）`
  - `- ~~**建议**：恢复可选登录~~（V1.3 已实现）`

### 变更 7：L2012 代码质量鉴权行
- 旧：`| 鉴权 | **DEMO MODE：无任何 \`Depends(get_current_active_user)\`** | 全后端搜索零命中 |`
- 新：`| 鉴权 | 真实 JWT：\`Depends(get_current_user)\` 强制校验（\`dependencies.py\`） | \`dependencies.py:12\`、38 个受保护端点 |`

### 变更 8：L2093 登录返回示例
- 旧：`  "access_token": "pathoptix_mock_token_2026",`
- 新：`  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJsb3JyeSIsImV4cCI6MTczNzI4MjQwMH0.signature（真实 JWT，1 小时过期）",`

### 变更 9：L2100-2103 特殊行为
- 旧（3 行）：
  ```
  - 密码不校验（`auth_service.py:32-36` 仅校验非空）
  - token 是固定字符串 `'pathoptix_mock_token_2026'`（`auth_service.py:40`），与前端硬编码 `demo_admin_token_2026` **不一致**（参见 Bug-1）
  - 用户名从 DB `users` 表读取，若不存在则 `full_name` 字段为 `None`
  ```
- 新（3 行）：
  ```
  - 密码使用 bcrypt 校验（`auth_service.py:58-74` `verify_password` 调用 `bcrypt.checkpw`）
  - token 为真实 JWT，由 `jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")` 签发，1 小时过期（`auth_service.py:89-119`）
  - 用户名从 DB `users` 表读取，若不存在则返回 401（`auth_service.py:32-43`）
  ```

### 变更 10：L3345 错误处理 401 行
- 旧：`| 前端 401 仅 \`console.warn\` 不跳转登录 | P2 | DEMO MODE 下可接受，生产化时需改 |`
- 新：`| ~~前端 401 仅 \`console.warn\` 不跳转登录~~ | ~~P2~~ | ~~V1.3 已解决：\`axiosInstance.ts:44-53\` 在 401 时清除 token 并派发 \`auth:logout\` 事件，\`App.tsx:56-63\` 切回登录视图~~ |`

### 变更 11：L3387 路径优化流程图
- 旧：`  │ Authorization: Bearer demo_admin_token_2026  (注:与后端不匹配但不校验)`
- 新：`  │ Authorization: Bearer <JWT>  (从 localStorage 读取，后端 get_current_user 校验)`

### 变更 12：L3476 聊天流程图
- 旧：`  │   headers: buildAuthHeaders(),  // Bearer demo_admin_token_2026`
- 新：`  │   headers: buildAuthHeaders(),  // Bearer <JWT from localStorage>`

### 变更 13：L3658 命名规范常量示例
- 旧：`| 常量 | UPPER_SNAKE | \`DEMO_TOKEN\`、\`BASE_URL\` |`
- 新：`| 常量 | UPPER_SNAKE | \`TOKEN_KEY\`、\`BASE_URL\` |`

### 变更 14：L3837 生产化前置条件第 1 条
- 旧：`1. 实现真实 JWT 认证（移除 DEMO MODE）`
- 新：`1. ~~实现真实 JWT 认证（移除 DEMO MODE）~~（V1.3 已完成）`

### 变更 15：新增 V1.3 版本变更记录（在 L3852 之后插入）
```
| **V1.3** | **2026-07-19** | **认证描述校正：前端已重构为真实 JWT 认证（localStorage 存储 + axios 拦截器 + LoginView 登录页 + 401 自动跳转）；后端使用真实 JWT + bcrypt；删除 Bug-1（Token 不一致，已不存在）；修正约 30 处 DEMO MODE / 固定 token / 硬编码 token 的过时描述；修复 LoginView 背景图 404；扩展至约 30000 字** | **AI 架构师（运行时验证 + 文档校正）** |
```

## Assumptions & Decisions（假设与决策）

1. **假设**：上一会话已修复 `LoginView.tsx`、`auth.ts`、`axiosInstance.ts`，无需再动代码。Phase 1 已通过 Read 工具验证此假设成立。
2. **决策**：所有"已解决"项保留原文并加删除线 + "V1.3 已解决"标注，而非直接删除。这样可保留历史信息，便于读者追溯问题演化。
3. **决策**：L1616（Bug-1 历史位置引用 `demo_admin_token_2026`）和 L1529（安全性表格 ~~DEMO_TOKEN 硬编码~~）保留不动——它们本身就在"已解决"上下文中，描述的是旧版问题，符合文档准确性要求。
4. **决策**：JWT 示例 token 使用截断格式（`eyJhbGci...signature（真实 JWT，1 小时过期）`），不写完整 token 避免误导读者以为是固定值。
5. **决策**：不修改任何代码文件。仅修改文档。前端背景图 404 已在上一会话修复，本次不重新验证（如需验证可在执行后通过浏览器检查）。

## Verification Steps（验证步骤）

1. **过时描述清零验证**：
   ```powershell
   Select-String -Path "项目开发文档V1.md" -Pattern "demo_admin_token|pathoptix_mock_token|DEMO_TOKEN" | ForEach-Object { "$($_.LineNumber): $($_.Line)" }
   ```
   预期：仅出现在 L1616（Bug-1 历史描述）和 L1529（已加删除线的安全性表格行）等"已解决"上下文中。

2. **DEMO MODE 残留验证**：
   ```powershell
   Select-String -Path "项目开发文档V1.md" -Pattern "DEMO MODE" | ForEach-Object { "$($_.LineNumber): $($_.Line)" }
   ```
   预期：每处均带"V1.3 已解决"或"~~删除线~~"标注。

3. **V1.3 版本记录验证**：
   ```powershell
   Select-String -Path "项目开发文档V1.md" -Pattern "V1\.3 \| 2026-07-19"
   ```
   预期：命中 1 行（新增的版本记录）。

4. **代码引用一致性验证**：搜索 `Bearer <JWT` 应出现 ≥3 次（L88、L3387、L3476）。

5. **行号偏移容忍**：由于 Edit 不会改变文件总行数（仅替换），所有行号在执行后应保持稳定。但若某次 Edit 改变行数（如变更 9 合并/拆分行），后续 Edit 需重新 Read 确认行号。

## 影响范围

- **代码修改**：0 个文件（代码层已完成）
- **文档修改**：1 个文件（`项目开发文档V1.md`），15 处变更（14 处修正 + 1 处新增）
- **风险评估**：极低。