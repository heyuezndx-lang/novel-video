@echo off
echo ========================================
echo   人生故事写作助手
echo ========================================
echo.
echo 启动中...
start http://127.0.0.1:9988
cd /d %~dp0backend
py -m uvicorn app.main:app --host 0.0.0.0 --port 9988
pause
