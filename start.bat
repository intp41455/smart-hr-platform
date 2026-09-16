@echo off
chcp 65001 >nul
title 康源智慧人资平台 - 启动中
cd /d C:\Users\intpj\WorkBuddy\2026-08-10-23-26-39\smart-hr-platform

echo ========================================
echo   康源智慧人资平台 - 一键启动
echo ========================================
echo.

REM 启动后端 (Node, 端口 3001)
echo [1/2] 正在启动后端服务 (端口 3001)...
start "HR后端" "C:\Users\intpj\.workbuddy\binaries\node\versions\22.22.2\node.exe" server/index.js

REM 等待后端就绪
timeout /t 3 /nobreak >nul

REM 启动前端 (Vite, 端口 5173, 绑定所有网卡供局域网访问)
echo [2/2] 正在启动前端服务 (端口 5173)...
echo.
echo ========================================
echo   启动完成！请勿关闭此窗口。
echo   本机访问:  http://localhost:5173
echo   同事访问:  http://THINKBOOK16P:5173
echo   (如同事用IP可访问, 但IP会变, 建议用电脑名)
echo ========================================
echo.

"C:\Users\intpj\.workbuddy\binaries\node\versions\22.22.2\node.exe" node_modules/vite/bin/vite.js --port 5173 --host 0.0.0.0
