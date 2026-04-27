@echo off
REM MindMap CLI Wrapper
REM This batch file allows invoking 'mindmap' from any directory

setlocal enabledelayedexpansion

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0

REM Call the mindmap-cli.js with all arguments passed through
node "%SCRIPT_DIR%mindmap-cli.js" %*

REM Preserve the exit code
exit /b %ERRORLEVEL%
