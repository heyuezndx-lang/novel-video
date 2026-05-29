@echo off
echo ========================================
echo   Novel Video - 小说写作助手
echo ========================================
echo.
echo 启动后端服务...
start "Novel Video API" cmd /c "cd /d %~dp0backend && py -m uvicorn app.main:app --host 127.0.0.1 --port 9988"
echo 后端 API: http://127.0.0.1:9988
echo API 文档: http://127.0.0.1:9988/docs
echo.
echo 启动前端...
start "Novel Video Frontend" cmd /c "cd /d %~dp0frontend && py -m http.server 9989"
echo 前端页面: http://127.0.0.1:9989
echo.
echo 两个窗口已打开，按任意键退出此脚本...
pause >nul
