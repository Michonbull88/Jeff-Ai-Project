@echo off
setlocal
cd /d "%~dp0"
title JEFF - Keep this window open
where node.exe >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\nodejs\node.exe" (
    set "PATH=%ProgramFiles%\nodejs;%PATH%"
  ) else (
    echo Install Node.js LTS and run 1 - SETUP JEFF.cmd first.
    start "" "%~dp0START HERE.html"
    pause
    exit /b 1
  )
)
node.exe "%~dp0app\scripts\windows-portable.mjs" start
if errorlevel 1 (
  echo.
  echo JEFF could not start. Read the message above.
  pause
  exit /b 1
)
