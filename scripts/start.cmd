@echo off
setlocal EnableDelayedExpansion

REM ========== ���ù���Ŀ¼ ==========
cd /d %~dp0\..

REM ========== ������־�ļ�·�� ==========
set LOGFILE=%cd%\start_log.txt

echo ================ ��Ŀ������־ ================ >> "%LOGFILE%"
echo ����ʱ��: %date% %time% >> "%LOGFILE%"

REM ========== ��һ������� Node.js ==========
echo [����1] ���ڼ�� Node.js ����... >> "%LOGFILE%"
where node >nul 2>&1
if errorlevel 1 (
    echo δ��⵽ Node.js�����Ȱ�װ�� >> "%LOGFILE%"
    echo δ��⵽ Node.js�����Ȱ�װ��
    pause
    exit /b 1
)
echo Node.js �������� >> "%LOGFILE%"

REM ========== �ڶ���������Ƿ�װ���� ==========
echo [����2] ���ڼ������... >> "%LOGFILE%"
if not exist "node_modules" (
    echo δ��⵽ node_modules����ʼ��װ����... >> "%LOGFILE%"
    npm install >> "%LOGFILE%" 2>&1
    if errorlevel 1 (
        echo ������װʧ�ܣ���������� npm ���� >> "%LOGFILE%"
        echo ������װʧ�ܣ���������� npm ���ã�
        pause
        exit /b 1
    )
    echo ������װ��� >> "%LOGFILE%"
) else (
    echo �Ѽ�⵽������������װ >> "%LOGFILE%"
)

REM ========== ��������������˷��� ==========
echo [����3] ����������˷���... >> "%LOGFILE%"
echo node backend/server.js >> temp_server_start.cmd
echo. >> temp_server_start.cmd
start "��˷���" cmd /k temp_server_start.cmd
echo ��˷������������ѷ��� >> "%LOGFILE%"

REM ========== ���Ĳ����ȴ���˷������� ==========
echo [����4] �ȴ� 5 ��ȷ��������������... >> "%LOGFILE%"
timeout /t 5 >nul

REM ========== ���岽����� ADB ==========
echo [����5] ��� ADB ״̬... >> "%LOGFILE%"
C:\platform-tools\scrcpy-win64-v3.2\adb.exe version >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    echo δ�ҵ� ADB ������ʧ�� >> "%LOGFILE%"
    echo δ�ҵ� ADB ������ʧ�ܣ���ȷ��·���Ͱ�װ
    pause
    exit /b 1
)
echo ADB �������� >> "%LOGFILE%"

REM ========== ��������������� ==========
echo [����6] ���ڴ�ϵͳ��ҳ http://localhost:3000 >> "%LOGFILE%"
start "" "http://localhost:3000"
echo ������Ѵ���ҳ >> "%LOGFILE%"

REM ========== ��β��Ϣ ==========
echo ========================================== >> "%LOGFILE%"
echo ��Ŀ������ɣ���鿴��־��%LOGFILE%
echo ����ر���Ŀ�������� scripts\\stop.cmd
pause
