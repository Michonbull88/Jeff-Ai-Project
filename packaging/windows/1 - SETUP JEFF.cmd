@echo off
setlocal
cd /d "%~dp0"
title JEFF - Windows setup
where node.exe >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else (
    echo Install Node.js LTS for Windows first. See START HERE.html.
    start "" "%~dp0START HERE.html"
    pause
    exit /b 1
  )
)
node.exe "%~dp0app\scripts\windows-portable.mjs" setup
if errorlevel 1 (
  echo.
  echo Setup did not finish. Read the message above and START HERE.html.
  pause
  exit /b 1
)
pause
