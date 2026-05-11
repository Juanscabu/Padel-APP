@echo off
REM Launcher de Padel Tracker.
REM Usa pythonw.exe (sin ventana de consola). Si la app no levanta,
REM volve a correrla con python.exe para ver el error.
setlocal
cd /d "%~dp0"

set "PYW=%LOCALAPPDATA%\Microsoft\WindowsApps\pythonw.exe"
set "PY=%LOCALAPPDATA%\Microsoft\WindowsApps\python.exe"

if exist "%PYW%" (
    start "" "%PYW%" padel_tracker.py
    exit /b 0
)

if exist "%PY%" (
    "%PY%" padel_tracker.py
    exit /b %errorlevel%
)

echo No se encontro pythonw.exe ni python.exe en %LOCALAPPDATA%\Microsoft\WindowsApps
echo Instala Python desde python.org o Microsoft Store y reintenta.
pause
exit /b 1
