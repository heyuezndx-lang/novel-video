@echo off
echo ========================================
echo   Novel Video - 小说写作助手
echo ========================================
echo.
echo 启动服务...
echo.
cd /d %~dp0backend
py -m uvicorn app.main:app --host 0.0.0.0 --port 9988
echo.
pause
