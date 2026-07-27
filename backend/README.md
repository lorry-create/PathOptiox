# PathOptix 后端服务

基于 FastAPI 框架的后端服务，为 PathOptix 强化学习路径优化引擎提供 API 支持。

## 技术栈

- **框架**：FastAPI 0.104.1
- **数据库**：SQLite (默认) / PostgreSQL
- **认证**：JWT Token
- **ORM**：SQLAlchemy 2.0
- **依赖管理**：pip

## 项目结构

```
backend/
├── app/
│   ├── api/           # API 路由
│   ├── models/        # 数据库模型
│   ├── schemas/       # 数据验证模式
│   ├── services/      # 业务逻辑服务
│   ├── config.py      # 配置管理
│   └── __init__.py
├── tests/             # 测试文件
├── main.py            # 应用入口
├── init_db.py         # 数据库初始化脚本
├── requirements.txt   # 依赖文件
├── .env               # 环境变量配置
├── start.sh           # Linux/Mac 启动脚本
├── start.bat          # Windows 启动脚本
└── README.md          # 项目说明
```

## 快速开始

### 1. 安装依赖

```bash
# 使用脚本启动（自动安装依赖）
bash start.sh  # Linux/Mac
start.bat      # Windows

# 或手动安装
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate.bat  # Windows
pip install -r requirements.txt
```

### 2. 配置环境变量

复制 `.env.example` 文件并重命名为 `.env`，根据需要修改配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
python init_db.py
```

### 4. 启动服务

```bash
python main.py
```

服务将在 `http://localhost:8000` 启动。

## API 文档

- **Swagger UI**：http://localhost:8000/docs
- **ReDoc**：http://localhost:8000/redoc

## 主要 API 端点

### 认证相关

- `POST /api/auth/register` - 注册新用户
- `POST /api/auth/login` - 用户登录（获取 token）
- `GET /api/auth/me` - 获取当前用户信息

### 健康检查

- `GET /health` - 服务健康检查

## 开发指南

### 添加新 API 路由

1. 在 `app/api/` 目录下创建新的路由文件
2. 在 `app/api/__init__.py` 中注册路由

### 添加新模型

1. 在 `app/models/` 目录下创建新的模型文件
2. 在 `init_db.py` 中导入模型以确保创建表结构

### 运行测试

```bash
pytest
```

## 生产环境部署

1. 修改 `.env` 文件中的配置：
   - 设置 `DEBUG=False`
   - 使用 PostgreSQL 数据库
   - 设置强密码的 `SECRET_KEY`

2. 使用 Gunicorn 作为生产服务器：

```bash
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
```

## 许可证

MIT
