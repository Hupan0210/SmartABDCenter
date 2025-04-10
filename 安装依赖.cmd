@echo off
echo 正在安装项目依赖，请稍候...
npm install
if %errorlevel% neq 0 (
  echo 安装过程中出现错误，请检查网络或npm配置！
  pause
  exit /b %errorlevel%
)
echo 依赖安装完成！
pause
