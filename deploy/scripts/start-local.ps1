#!/usr/bin/env pwsh
# ============================================================
# PathOptix Dashboard - Windows 本地开发快速启动脚本
# 用途: 一键构建并启动前后端 Docker 容器（开发环境）
# 使用方法: .\start-local.ps1
# ============================================================

$ErrorActionPreference = "Stop"

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "[ERR]  $msg" -ForegroundColor Red }

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $ProjectRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  PathOptix 本地开发环境启动" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Info "[1/5] 检查 Docker 环境..."
try {
    docker --version | Out-Null
    docker compose version | Out-Null
    Write-Ok "Docker 环境正常"
} catch {
    Write-Err "Docker 未安装或未启动！请先安装 Docker Desktop"
    exit 1
}

Write-Info "[2/5] 检查端口占用..."
$port9010 = Get-NetTCPConnection -LocalPort 9010 -ErrorAction SilentlyContinue
$port8010 = Get-NetTCPConnection -LocalPort 8010 -ErrorAction SilentlyContinue
if ($port9010) { Write-Warn "端口 9010 已被占用 (PID: $($port9010.OwningProcess))" }
if ($port8010) { Write-Warn "端口 8010 已被占用 (PID: $($port8010.OwningProcess))" }

Write-Info "[3/5] 清理旧容器..."
docker compose down --remove-orphans 2>$null
Write-Ok "清理完成"

Write-Info "[4/4] 构建并启动服务..."
docker compose up -d --build
Write-Ok "构建完成"

Write-Info "[5/5] 等待服务就绪..."
Start-Sleep -Seconds 8

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  启动完成！" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  前端地址: http://localhost:9010" -ForegroundColor White
Write-Host "  后端API: http://localhost:8010" -ForegroundColor White
Write-Host "  API文档: http://localhost:8010/docs" -ForegroundColor White
Write-Host ""
Write-Host "  常用命令:" -ForegroundColor Yellow
Write-Host "  docker compose logs -f       # 查看实时日志" -ForegroundColor Gray
Write-Host "  docker compose down           # 停止服务" -ForegroundColor Gray
Write-Host "  docker compose restart        # 重启服务" -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Cyan
