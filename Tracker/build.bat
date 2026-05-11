@echo off
REM Reconstruye dist\PadelTracker.exe desde el codigo actual.
REM La primera vez tarda ~1-2 min; las siguientes ~20-30s gracias al cache.
setlocal
cd /d "%~dp0"
set "PY=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"
if not exist "%PY%" (
    echo No se encontro python.exe en %PY%
    pause
    exit /b 1
)
"%PY%" -m PyInstaller --noconfirm --onefile --windowed --name PadelTracker padel_tracker.py
if %errorlevel% neq 0 (
    echo.
    echo Build FALLO. Si es la primera vez, instala PyInstaller con:
    echo     "%PY%" -m pip install --user pyinstaller
    pause
    exit /b 1
)
echo.
echo OK. El .exe esta en dist\PadelTracker.exe
echo Copia ese archivo a otra PC y se ejecuta sin instalar nada.
pause
