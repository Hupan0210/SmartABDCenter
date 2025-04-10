@echo off
setlocal EnableDelayedExpansion

REM ========== 设置工作目录 ==========
cd /d %~dp0\..

REM ========== 设置日志文件路径 ==========
set LOGFILE=%cd%\start_log.txt

echo ================ 项目启动日志 ================ >> "%LOGFILE%"
echo 启动时间: %date% %time% >> "%LOGFILE%"

REM ========== 第一步：检查 Node.js ==========
echo [步骤1] 正在检查 Node.js 环境... >> "%LOGFILE%"
where node >nul 2>&1
if errorlevel 1 (
    echo 未检测到 Node.js，请先安装！ >> "%LOGFILE%"
    echo 未检测到 Node.js，请先安装！
    pause
    exit /b 1
)
echo Node.js 环境正常 >> "%LOGFILE%"

REM ========== 第二步：检查是否安装依赖 ==========
echo [步骤2] 正在检查依赖... >> "%LOGFILE%"
if not exist "node_modules" (
    echo 未检测到 node_modules，开始安装依赖... >> "%LOGFILE%"
    npm install >> "%LOGFILE%" 2>&1
    if errorlevel 1 (
        echo 依赖安装失败，请检查网络或 npm 配置 >> "%LOGFILE%"
        echo 依赖安装失败，请检查网络或 npm 配置！
        pause
        exit /b 1
    )
    echo 依赖安装完成 >> "%LOGFILE%"
) else (
    echo 已检测到依赖，跳过安装 >> "%LOGFILE%"
)

REM ========== 第三步：启动后端服务 ==========
echo [步骤3] 正在启动后端服务... >> "%LOGFILE%"
echo node backend/server.js >> temp_server_start.cmd
echo. >> temp_server_start.cmd
start "后端服务" cmd /k temp_server_start.cmd
echo 后端服务启动命令已发送 >> "%LOGFILE%"

REM ========== 第四步：等待后端服务启动 ==========
echo [步骤4] 等待 5 秒确保服务正常启动... >> "%LOGFILE%"
timeout /t 5 >nul

REM ========== 第五步：检查 ADB ==========
echo [步骤5] 检查 ADB 状态... >> "%LOGFILE%"
C:\platform-tools\scrcpy-win64-v3.2\adb.exe version >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    echo 未找到 ADB 或运行失败 >> "%LOGFILE%"
    echo 未找到 ADB 或运行失败，请确认路径和安装
    pause
    exit /b 1
)
echo ADB 正常可用 >> "%LOGFILE%"

REM ========== 第六步：打开浏览器 ==========
echo [步骤6] 正在打开系统主页 http://localhost:3000 >> "%LOGFILE%"
start "" "http://localhost:3000"
echo 浏览器已打开主页 >> "%LOGFILE%"

REM ========== 结尾信息 ==========
echo ========================================== >> "%LOGFILE%"
echo 项目启动完成！请查看日志：%LOGFILE%
echo 如需关闭项目，请运行 scripts\\stop.cmd
pause
