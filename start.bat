@echo off
chcp 65001 >nul
echo 人生故事写作助手 - 启动中...
cd "%~dp0backend"
start explorer "http://127.0.0.1:9988"
python -m uvicorn app.main:app --host 0.0.0.0 --port 9988
pause
