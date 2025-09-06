@echo off
echo 🎨 Brand Manager - Quick Start
echo ==============================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is required but not installed.
    echo Please install Python and try again.
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
pip install -r requirements.txt

REM Start the application
echo 🚀 Starting Brand Manager...
python run.py
pause
