#!/bin/bash
# ============================================================
# PathOptix Dashboard - 服务器端部署脚本
# 用途: 从 tar 镜像文件加载并启动前后端容器
# 使用方法:
#   1. 将 pathoptix-images.tar 上传到服务器此脚本同目录
#   2. chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

info()    { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $*"; }
success() { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $*"; }
warn()    { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $*"; }
error()   { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $*"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TAR_FILE="${SCRIPT_DIR}/pathoptix-images.tar"
NETWORK_NAME="pathoptix-net"
BACKEND_IMAGE="pathoptix-backend:latest"
FRONTEND_IMAGE="pathoptix-frontend:latest"
BACKEND_CONTAINER="pathoptix-backend"
FRONTEND_CONTAINER="pathoptix-frontend"

usage() {
    echo "PathOptix 服务器部署工具"
    echo ""
    echo "用法: ./deploy.sh <命令>"
    echo ""
    echo "命令:"
    echo "  load     加载镜像从 tar 文件（首次部署必须先执行）"
    echo "  start    启动所有容器"
    echo "  stop     停止所有容器"
    echo "  restart  重启所有容器"
    echo "  status   查看容器运行状态"
    echo "  logs     查看日志 [backend|frontend|all]"
    echo "  cleanup  删除所有容器和镜像（慎用）"
    echo "  help     显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./deploy.sh load          # 首次：加载镜像"
    echo "  ./deploy.sh start         # 启动服务"
    echo "  ./deploy.sh logs backend  # 查看后端日志"
}

check_docker() {
    if ! command -v docker &> /dev/null; then
        error "Docker 未安装！请先安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    if ! docker info &> /dev/null; then
        error "Docker 未运行！请先启动 Docker 服务: sudo systemctl start docker"
        exit 1
    fi
}

check_tar() {
    if [ ! -f "$TAR_FILE" ]; then
        error "镜像文件不存在: ${TAR_FILE}"
        error "请先将 pathoptix-images.tar 上传到此目录"
        exit 1
    fi
}

cmd_load() {
    check_docker
    check_tar

    info "开始加载 Docker 镜像..."
    info "镜像文件: $(du -h "$TAR_FILE" | cut -f1)"

    docker load -i "$TAR_FILE"

    success "镜像加载完成！"
    echo ""
    docker images --filter "reference=pathoptix-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"
}

cmd_start() {
    check_docker

    info "创建 Docker 网络: ${NETWORK_NAME}"
    docker network create "${NETWORK_NAME}" 2>/dev/null || true

    info "启动后端容器: ${BACKEND_CONTAINER}"
    docker run -d \
        --name "${BACKEND_CONTAINER}" \
        --network "${NETWORK_NAME}" \
        --restart unless-stopped \
        -p 8010:8010 \
        -v pathoptix-db-data:/app/data \
        -v pathoptix-logs:/app/logs \
        -e DEBUG=False \
        -e 'BACKEND_CORS_ORIGINS=["http://localhost:9010","http://127.0.0.1:9010"]' \
        --health-cmd='python -c "import requests; requests.get(\"http://localhost:8010/api/health\")"' \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "${BACKEND_IMAGE}"

    info "等待后端健康检查通过..."
    sleep 10

    info "启动前端容器: ${FRONTEND_CONTAINER}"
    docker run -d \
        --name "${FRONTEND_CONTAINER}" \
        --network "${NETWORK_NAME}" \
        --restart unless-stopped \
        -p 9010:9010 \
        "${FRONTEND_IMAGE}"

    echo ""
    success "=========================================="
    success "  PathOptix 部署完成！"
    success "=========================================="
    echo ""
    info "前端访问地址: http://<服务器IP>:9010"
    info "后端API地址:  http://<服务器IP>:8010"
    info "API文档(Swagger): http://<服务器IP>:8010/docs"
    echo ""
    info "查看运行状态: ./deploy.sh status"
    info "查看日志:     ./deploy.sh logs all"
    info "停止服务:     ./deploy.sh stop"
}

cmd_stop() {
    check_docker

    info "停止前端容器..."
    docker stop "${FRONTEND_CONTAINER}" 2>/dev/null || true
    docker rm "${FRONTEND_CONTAINER}" 2>/dev/null || true

    info "停止后端容器..."
    docker stop "${BACKEND_CONTAINER}" 2>/dev/null || true
    docker rm "${BACKEND_CONTAINER}" 2>/dev/null || true

    success "所有容器已停止并移除"
}

cmd_restart() {
    cmd_stop
    cmd_start
}

cmd_status() {
    check_docker

    echo ""
    echo "=== PathOptix 容器状态 ==="
    echo ""
    docker ps -a --filter "name=pathoptix-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo ""
    if docker inspect "${BACKEND_CONTAINER}" &> /dev/null; then
        echo "=== 后端健康状态 ==="
        docker inspect --format='{{.State.Health.Status}}' "${BACKEND_CONTAINER}" 2>/dev/null || echo "无健康检查信息"
    fi
}

cmd_logs() {
    local target="${1:-all}"

    case "$target" in
        backend)
            docker logs -f --tail 100 "${BACKEND_CONTAINER}"
            ;;
        frontend)
            docker logs -f --tail 100 "${FRONTEND_CONTAINER}"
            ;;
        all)
            warn "=== 后端日志 ==="
            docker logs --tail 30 "${BACKEND_CONTAINER}" 2>&1 || true
            echo ""
            warn "=== 前端日志 ==="
            docker logs --tail 30 "${FRONTEND_CONTAINER}" 2>&1 || true
            ;;
        *)
            error "未知目标: ${target}"
            echo "用法: ./deploy.sh logs [backend|frontend|all]"
            exit 1
            ;;
    esac
}

cmd_cleanup() {
    warn "此操作将删除所有 PathOptix 容器和本地镜像！"
    read -rp "确认继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        info "已取消"
        exit 0
    fi

    cmd_stop

    info "删除镜像..."
    docker rmi "${FRONTEND_IMAGE}" 2>/dev/null || true
    docker rmi "${BACKEND_IMAGE}" 2>/dev/null || true

    info "删除网络..."
    docker network rm "${NETWORK_NAME}" 2>/dev/null || true

    success "清理完成"
}

case "${1:-help}" in
    load)     cmd_load ;;
    start)    cmd_start ;;
    stop)     cmd_stop ;;
    restart)  cmd_restart ;;
    status)   cmd_status ;;
    logs)     cmd_logs "${2:-all}" ;;
    cleanup)  cmd_cleanup ;;
    help|--help|-h) usage ;;
    *)
        error "未知命令: $1"
        usage
        exit 1
        ;;
esac
