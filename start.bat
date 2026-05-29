@echo off
title 人生故事写作助手
echo ========================================
echo   人生故事写作助手
echo ========================================
echo.
cd /d %~dp0backend
echo 启动后端服务...
start "人生故事服务" cmd /c "py -m uvicorn app.main:app --host 0.0.0.0 --port 9988"
echo 等待服务就绪...
timeout /t 5 /nobreak
echo 打开浏览器...
explorer http://127.0.0.1:9988
echo 服务已启动！浏览器已打开。
pause
