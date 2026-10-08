@echo off
setlocal
cd /d "%~dp0app"
set "JEFF_NODE=%ProgramFiles%\nodejs\node.exe"
if not exist "%JEFF_NODE%" set "JEFF_NODE=node.exe"
"%JEFF_NODE%" scripts\windows-portable.mjs start
if errorlevel 1 (
  echo.
  echo JEFF could not start. Please run the JEFF installer again to repair it.
  pause
)
