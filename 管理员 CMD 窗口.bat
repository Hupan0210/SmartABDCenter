@echo off
:: 判断是否为管理员
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ? 当前已是管理员权限
    pushd %~dp0
    cmd
    exit /b
)

:: 否则尝试以管理员权限重新打开 CMD，定位当前目录
set "workdir=%~dp0"
echo 正在以管理员权限打开 CMD...
powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \"%workdir%\"' -Verb runAs"
exit

