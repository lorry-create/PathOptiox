# PathOptix 项目长期记忆

## 项目概述
PathOptix 物流路径优化平台，前后端分离架构。

## 启动方式
- **后端**：`cd backend && ./venv/Scripts/python.exe main.py`（端口 8010，FastAPI + Uvicorn，带 reload）
  - venv 位于 `backend/venv`（Windows: venv/Scripts/，非 bin/）
  - 依赖 `.env`（必须含 SECRET_KEY，不能用默认占位符）
  - 启动自动初始化数据库（init_db 建表+seed）和 RAG 向量索引
  - start.sh 是 Linux 脚本，Windows 下直接用 venv python 启动
- **前端**：项目根目录 `npm run dev`（端口 3000，Vite v6 + React 19 + TypeScript）
  - 别名：@ → src，@components/@features/@ui/@services 等

## 技术栈
- 后端：FastAPI, SQLAlchemy, Alembic, Pydantic, JWT(bcrypt+python-jose), torch, stable-baselines3, langgraph/langchain-openai
- 前端：React 19, Vite 6, Zustand, Recharts, D3, TailwindCSS, axios, lucide-react
- 数据库：SQLite (pathoptix.db)
