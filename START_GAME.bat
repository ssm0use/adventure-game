@echo off
cd /d "%~dp0"

echo =====================================
echo   Cursed Farm Adventure - Launcher
echo =====================================
echo.

:: Check for Python 3
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    :: Verify it's Python 3
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
    echo %PYTHON_VERSION% | findstr /b "3." >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        set PYTHON_CMD=python
        goto :start_game
    )
)

where python3 >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PYTHON_CMD=python3
    goto :start_game
)

:: Python not found
echo ERROR: Python 3 is not installed on this computer.
echo.
echo Python is needed to run a local web server for the game.
echo.
set /p INSTALL_CHOICE="Would you like to open the Python download page? (y/n): "
echo.

if /i "%INSTALL_CHOICE%"=="y" (
    echo Opening the Python download page...
    echo.
    echo Please download and install Python 3 from the website.
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo Then close this window and run the launcher again.
    echo.
    start https://www.python.org/downloads/
    pause
    exit /b 1
) else (
    echo You can install Python 3 manually from: https://www.python.org/downloads/
    echo IMPORTANT: Check "Add Python to PATH" during installation!
    echo Then run this launcher again.
    echo.
    pause
    exit /b 1
)

:start_game
echo Starting Cursed Farm Adventure...
echo.

:: Start the server in the background
start /b %PYTHON_CMD% -m http.server 8000

:: Wait for the server to be ready
echo Waiting for server to start...
set ATTEMPTS=0
:wait_loop
if %ATTEMPTS% geq 30 goto :open_browser
powershell -command "(Invoke-WebRequest -Uri http://localhost:8000 -UseBasicParsing -TimeoutSec 1).StatusCode" >nul 2>nul
if %ERRORLEVEL% equ 0 goto :open_browser
set /a ATTEMPTS+=1
timeout /t 1 /nobreak >nul
goto :wait_loop

:open_browser
echo Opening browser at http://localhost:8000
echo.
echo The game is now running!
echo Close this window to stop the server when done.
echo.
start http://localhost:8000

:: Keep the window open so the server keeps running
pause >nul
