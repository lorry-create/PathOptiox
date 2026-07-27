# PathOptix 部署体系

> 本目录集中管理 PathOptix Dashboard 的所有部署资产。

## 目录结构

```
deploy/
├── README.md                    # 本文件 — 部署总览与快速索引
├── docker/                      # Docker 构建配置
│   ├── Dockerfile.backend       # 后端生产镜像 (Python 3.10 + CPU PyTorch)
│   ├── Dockerfile.backend.dev   # 后端开发镜像 (uvicorn 热重载)
│   └── Dockerfile.frontend      # 前端镜像 (Node 构建 → Nginx 运行)
├── nginx.conf                   # Nginx 反向代理配置（API 转发 + SPA 路由）
└── scripts/                     # 部署辅助脚本
    ├── deploy.sh                # Linux 服务器 tar 包部署
    └── start-local.ps1          # Windows 本地开发一键启动
```

## 文件说明

### Docker 构建文件

| 文件 | 用途 | 基础镜像 | 最终大小 |
|------|------|---------|---------|
| `Dockerfile.backend` | **生产后端** — CPU-only PyTorch + requirements-prod.txt | `python:3.10-slim` | ~500MB-1GB |
| `Dockerfile.backend.dev` | **开发后端** — 完整依赖 + uvicorn 热重载 | `python:3.10-slim` | ~1.5GB+ |
| `Dockerfile.frontend` | **前端** — 多阶段构建 (Node → Nginx) | `node:18-alpine` → `nginx:alpine` | ~25-40MB |

### 配置文件

| 文件 | 用途 | 使用位置 |
|------|------|---------|
| `nginx.conf` | Nginx 反向代理：SPA 路由回退 + `/api/` 转发后端 + `/docs` 代理 | 构建时复制到前端容器 |

### 部署脚本

| 脚本 | 平台 | 用途 | 使用方法 |
|------|------|------|---------|
| `scripts/deploy.sh` | Linux/macOS | 服务器端 tar 镜像部署（load/start/stop/logs） | `chmod +x deploy.sh && ./deploy.sh start` |
| `scripts/start-local.ps1` | Windows | 本地开发一键构建启动 | `.\start-local.ps1` |

## 端口规划

| 端口 | 服务 | 对外暴露 | 说明 |
|------|------|---------|------|
| **9010** | Frontend (Nginx) | ✅ 是 | 用户浏览器访问入口 |
| **8010** | Backend (FastAPI) | ✅ 是(调试) / ❌ 否(生产) | API 服务，通过 Nginx `/api/` 转发 |

## ⚠️ 部署前必读：环境变量配置

### 必须配置的文件：`.env.backend`

docker-compose.yml 通过 `env_file:` 指令加载此文件到后端容器。**部署前必须填写实际值**：

```bash
# 项目根目录已提供模板，直接编辑即可：
# .env.backend ← 编辑此文件
```

**关键变量说明：**

| 变量名 | 必须 | 默认值 | 说明 |
|--------|------|--------|------|
| `SECRET_KEY` | ✅ | `CHANGE_ME...` | JWT 签名密钥，必须替换为 ≥32 字符随机字符串 |
| `DASHSCOPE_API_KEY` | ✅* | `your-...-here` | 阿里云百炼 API Key。**路径优化功能必需**，不填则路径优化接口报错 |
| `DEBUG` | ❌ | `False` | 生产环境保持 False |
| `DATABASE_URL` | ❌ | SQLite 默认路径 | 数据库连接串 |

> *注：如果不使用 AI 路径优化功能（仅使用仪表盘、订单管理等模块），可以留空 `DASHSCOPE_API_KEY`。

**生成 SECRET_KEY 的方法：**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**获取 DASHSCOPE_API_KEY 的方法：**
1. 登录 [阿里云百炼控制台](https://dashscope.console.aliyun.com/apiKey)
2. 创建或复制 API Key
3. 粘贴到 `.env.backend` 中

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 步骤 1：编辑后端环境变量（首次部署必须）
# 用编辑器打开 .env.backend，填入 SECRET_KEY 和 DASHSCOPE_API_KEY

# 步骤 2：构建并启动
docker compose build          # 构建镜像
docker compose up -d          # 后台启动
docker compose ps             # 查看状态

# 访问
# 前端: http://localhost:9010
# API:  http://localhost:8010/docs
```

### 方式二：Windows 本地开发

```powershell
cd deploy/scripts
.\start-local.ps1
```

### 方式三：Linux 服务器部署

```bash
# 1. 加载预构建的 tar 镜像
./deploy.sh load

# 2. 启动容器
./deploy.sh start

# 3. 查看状态和日志
./deploy.sh status
./deploy.sh logs all
```

## 与根目录文件的关系

| 根目录文件 | 作用 | 关联 |
|-----------|------|------|
| `docker-compose.yml` | **唯一编排入口**，引用 `deploy/docker/` 下的 Dockerfile | → `deploy/docker/Dockerfile.*` |
| `.env.backend` | **后端运行时环境变量**（Docker Compose 加载） | docker-compose.yml `env_file:` 引用 |
| `.dockerignore` | Docker 构建时排除不需要的文件 | 控制构建上下文大小 |
| `.env.production` | 前端生产环境变量 (`VITE_API_BASE_URL=` 空) | 被 `Dockerfile.frontend` 构建时嵌入 JS |
| `.env.development` | 前端开发环境变量 (`VITE_API_BASE_URL=http://localhost:8010`) | 本地 `npm run dev` 使用 |
| `backend/.env.example` | 后端环境变量参考模板 | 本地直接运行 Python 时使用 |

## 详细文档

完整的部署流程、环境配置、故障排查等内容请参阅：

📖 [deployment-guide.md](../docs/deployment-guide.md) — PathOptix Docker 部署完整指南 v2.0
