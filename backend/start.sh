#!/bin/bash

# 启动后端服务

# 检查并安装依赖
if [ ! -d "venv" ]; then
    echo "创建虚拟环境..."
    python3 -m venv venv
fi

echo "激活虚拟环境..."
source venv/bin/activate

echo "安装依赖..."
pip install -r requirements.txt

echo "初始化数据库..."
# 通过 Alembic 迁移管理表结构，main.py 启动时会自动 seed 示例数据
alembic upgrade head

echo "启动服务..."
python main.py
