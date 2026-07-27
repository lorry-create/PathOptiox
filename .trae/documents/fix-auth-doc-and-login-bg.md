# 修复登录背景图 404 + 更新文档认证描述

## Context（背景）

用户要求"修复这个 bug"，指的是上一条回复中报告的"前后端 Token 不一致 bug"。但经过完整代码验证（grep 搜索、源码逐行阅读、curl 端到端测试、浏览器可视化测试），发现**该 bug 在当前代码中并不存在**——上一条回复基于过时的会话摘要得出了错误结论。

**真实情况：**
- 前端代码已完全重构为真实 JWT 认证（`httpClient.ts` / `axiosInstance.ts` 从 `localStorage` 读取 `access_token`，无任何硬编码 token）
- 后端使用真实 JWT + bcrypt 认证（默认账号 `lorry/123456`）
- 端到端验证全部通过（登录 → /auth/me → /orders → /dashboard 全部 200）
- 文档 V1.2 中约 30 处描述基于旧版代码，需要修正

**实际发现的小问题：**
- 登录页 `LoginView.tsx` 启动时调用 `authApi.getLoginBackground()` 请求 `${baseUrl}/images/login-bg`，但后端无此接口，返回 404（前端已优雅降级，不影响功能，但控制台会有 404 报错）

用户已确认选择：**更新文档 + 修复背景图 404**

## 实施方案

### 任务 1：修复登录背景图 404（前端）

**文件：** `src/components/features/auth/LoginView.tsx`

**问题：** 第 17-32 行的 `useEffect` 调用 `authApi.getLoginBackground()` 请求不存在的后端接口 `/api/images/login-bg`，导致 404。

**修复策略：** 移除后端图片依赖，改用已有的 CSS 渐变背景（`network-gradient` 类已在 `themes.css:118-120` 定义）。登录页左侧已有 `network-gradient` 作为底层背景，移除图片层后视觉效果依然完整。

**具体改动：**
1. 删除 `LoginView.tsx` 第 15 行的 `bgUrl` state
2. 删除第 17-32 行的 `useEffect`（加载背景图的逻辑）
3. 删除第 56-59 行的背景图 `<div>`（`bgUrl ? url(...) : undefined`）
4. 保留第 55 行的 `<div className="absolute inset-0 network-gradient"></div>` 作为背景
5. 移除不再使用的 `useEffect` import（如果其他地方没用）

**同时清理 `src/services/modules/auth.ts`：**
- 删除第 49-52 行的 `getLoginBackground` 方法（不再被调用，避免遗留死代码）

### 任务 2：更新文档 V1.2 → V1.3（修正认证相关描述）

**文件：** `项目开发文档V1.md`

**需修正的约 30 处描述（按位置分组）：**

#### 2.1 目录结构描述（L233, L183）
- L233: `auth/  # 登录组件（DEMO MODE 已禁用）` → `auth/  # 登录组件（LoginView，真实 JWT 登录）`
- L183: `auth_service.py  # 认证（固定 token，不校验密码）` → `auth_service.py  # 认证（真实 JWT + bcrypt 密码哈希）`

#### 2.2 前端分析章节（L544, L598, L969）
- L544: 删除或修正 `// [DEMO MODE] 登录与鉴权已完全移除 — 直接进入仪表盘` 注释引用
- L598: `auth | LoginForm（已禁用，DEMO MODE）` → `auth | LoginView（真实 JWT 登录页）`
- L969: 删除 `const DEMO_TOKEN = 'demo_admin_token_2026';` 代码引用，替换为真实 localStorage 读取逻辑

#### 2.3 第七部分接口联调分析（L974-985, L1004）
- L974-985: 整个"7.1.3 后端固定 token"小节需重写为"7.1.3 后端真实 JWT 认证"
- L1004: `认证 | POST /api/auth/login | ... | 后端不校验密码，固定 token` → `认证 | POST /api/auth/login | ... | 真实 JWT + bcrypt 校验`

#### 2.4 第八部分 AI 模块（L1303-1305）
- 修正流程图中 `DEMO MODE 进入` 和 `Authorization: Bearer demo_admin_token_2026` 描述

#### 2.5 第十二部分存在的问题（L1480, L1499, L1503, L1513-1514, L1584-1590, L1689, L1756）
- **L1584-1590 Bug-1**: 整个"Bug-1：前后端 Token 不一致"小节需重写为"Bug-1（已修正）：旧版 Token 不一致问题已在代码重构中解决"
- L1480: `前端 401 不跳转登录页` → `前端 401 自动清除 token 并跳转登录页（axiosInstance 响应拦截器）`
- L1499: `Token 前后端不一致` 风险项需删除或标注已解决
- L1503: `DEMO_TOKEN 硬编码` 风险项需删除或标注已解决
- L1689 Risk-1: `DEMO MODE 移除认证` → `真实 JWT 认证已实现，但生产部署需配置 SECRET_KEY`
- L1756 UX-1: `DEMO MODE 无登录流程` → 删除或标注已解决

#### 2.6 第十部分代码质量（L1980）
- L1980: `鉴权 | DEMO MODE：无任何 Depends(get_current_active_user)` → `鉴权 | 真实 JWT：get_current_user 依赖注入（dependencies.py）`

#### 2.7 第十四部分接口说明（L2061, L2070, L3355, L3444）
- L2061: `"access_token": "pathoptix_mock_token_2026"` → 真实 JWT 示例
- L2070: 删除 `token 是固定字符串` 描述
- L3355: `Authorization: Bearer demo_admin_token_2026 (注:与后端不匹配但不校验)` → `Authorization: Bearer <真实JWT>`
- L3444: `buildAuthHeaders() // Bearer demo_admin_token_2026` → `buildAuthHeaders() // Bearer <从localStorage读取的JWT>`

#### 2.8 第十五部分错误处理（L3313）
- L3313: `前端 401 仅 console.warn 不跳转登录 | DEMO MODE 下可接受` → `前端 401 自动清除 token 并跳转登录页（已实现）`

#### 2.9 第十八部分版本规划（L3806）
- L3806: `实现真实 JWT 认证（移除 DEMO MODE）` → 标注为已完成

#### 2.10 新增 V1.3 版本变更记录
在第十八部分 18.1 文档版本历史表中新增：
```
| V1.3 | 2026-07-19 | 修正认证相关描述：前端已重构为真实 JWT 认证（localStorage 存储 + axios 拦截器 + LoginView 登录页 + 401 自动跳转）；后端使用真实 JWT + bcrypt；删除 Bug-1（Token 不一致，已不存在）；修正约 30 处 DEMO MODE / 固定 token / 硬编码 token 的过时描述；修复 LoginView 背景图 404 | AI 架构师（运行时验证 + 文档校正） |
```

## 验证方案

### 验证任务 1（背景图修复）
1. 重启前端：`npm run dev`（Vite HMR 会自动热更新）
2. 浏览器打开 http://localhost:3000/，清除 localStorage（DevTools → Application → Local Storage → Clear）
3. 确认登录页正常渲染（左侧渐变背景 + 右侧登录卡片）
4. 确认浏览器控制台**无 404 错误**（之前会有 `/api/images/login-bg` 404）
5. 输入 `lorry` / `123456` 登录，确认进入主应用

### 验证任务 2（文档更新）
1. `Select-String` 搜索文档确认 `demo_admin_token` 出现 0 次（或仅在"已修正"上下文中出现）
2. `Select-String` 搜索文档确认 `DEMO MODE` 出现次数大幅减少（仅在"历史描述/已修正"上下文中出现）
3. 确认 V1.3 版本记录已添加
4. 确认 Bug-1 已标注为"已解决/不存在"

## 影响范围

- **代码修改：** 2 个前端文件（`LoginView.tsx`、`auth.ts`），仅删除死代码，不改变登录功能
- **文档修改：** 1 个文件（`项目开发文档V1.md`），约 30 处描述修正
- **风险评估：** 低风险。前端改动仅移除 404 请求，登录页已有 CSS 渐变兜底；文档改动为描述性内容，不影响