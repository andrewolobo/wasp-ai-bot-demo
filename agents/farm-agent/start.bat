@echo off
REM Farm Agent Service Startup Script
REM ==================================

echo.
echo ============================================
echo   Farm Agent Service
echo   Payment Collections Agent
echo ============================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.9 or higher
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure it
    echo.
    echo Run: copy .env.example .env
    pause
    exit /b 1
)

REM Check if dependencies are installed
python -c "import aio_pika" >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the agent service
echo Starting Farm Agent Service...
echo.
python -m main

pause
