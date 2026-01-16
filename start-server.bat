@echo off
echo ========================================
echo   Solar System WebGL - Local Server
echo ========================================
echo.
echo Starting local HTTP server...
echo Open your browser to: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
echo ========================================
echo.

REM Try Python 3 first
python -m http.server 8000 2>nul
if %errorlevel% neq 0 (
    REM Try Python 2 if Python 3 fails
    python -m SimpleHTTPServer 8000 2>nul
    if %errorlevel% neq 0 (
        echo ERROR: Python is not installed or not in PATH
        echo.
        echo Please install Python from: https://www.python.org/downloads/
        echo.
        pause
    )
)
