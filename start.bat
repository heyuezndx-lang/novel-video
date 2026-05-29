@echo off
title 人生故事写作助手
echo 正在启动，请稍候...
cd /d %~dp0backend
start "" py -m uvicorn app.main:app --host 0.0.0.0 --port 9988
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:9988"
echo 服务已启动！
