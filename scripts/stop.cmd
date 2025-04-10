@echo off
setlocal EnableDelayedExpansion

REM Define log file path (same as start.cmd)
set LOGFILE=%~dp0..\start_log.txt

echo ================ Project Stop Log ================ >> "%LOGFILE%"
echo Stop Time: %date% %time% >> "%LOGFILE%"

echo [Step 1] Attempting to close backend service window... >> "%LOGFILE%"
taskkill /FI "WINDOWTITLE eq Backend Service" /F >> "%LOGFILE%" 2>&1
if errorlevel 1 (
    echo Failed to close backend service window or not found. >> "%LOGFILE%"
    echo [Warning] Backend service window not closed or not found!
) else (
    echo Backend service window closed successfully. >> "%LOGFILE%"
)

echo [Step 2] Checking for processes listening on port 3000 and attempting to close them... >> "%LOGFILE%"
for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| find ":3000"') do (
    echo Found process with PID: %%a >> "%LOGFILE%"
    taskkill /PID %%a /F >> "%LOGFILE%" 2>&1
    echo Process PID %%a terminated. >> "%LOGFILE%"
)

echo [Step 3] Project stop operations completed. >> "%LOGFILE%"
echo Project stopped. Check log: %LOGFILE%
pause
