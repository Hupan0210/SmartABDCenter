@echo off
:: �ж��Ƿ�Ϊ����Ա
net session >nul 2>&1
if %errorlevel% == 0 (
    echo ? ��ǰ���ǹ���ԱȨ��
    pushd %~dp0
    cmd
    exit /b
)

:: �������Թ���ԱȨ�����´� CMD����λ��ǰĿ¼
set "workdir=%~dp0"
echo �����Թ���ԱȨ�޴� CMD...
powershell -Command "Start-Process cmd -ArgumentList '/k cd /d \"%workdir%\"' -Verb runAs"
exit

