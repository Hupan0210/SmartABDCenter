@echo off
echo ���ڰ�װ��Ŀ���������Ժ�...
npm install
if %errorlevel% neq 0 (
  echo ��װ�����г��ִ������������npm���ã�
  pause
  exit /b %errorlevel%
)
echo ������װ��ɣ�
pause
