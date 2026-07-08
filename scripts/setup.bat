@echo off
echo === torio — установка ===

rem 1. Проверить Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Ошибка: Node.js не найден. Установите Node.js v22+ и повторите.
  pause
  exit /b 1
)

echo Node.js: 
node -v

rem 2. Глобальная установка
echo Устанавливаю torio-cli...
npm install -g torio-cli

echo.
echo Готово! Запустите: torio
pause
