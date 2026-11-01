@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>&1
if %errorlevel%==0 (
  py -3 -c "import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)" >nul 2>&1
  if %errorlevel%==0 (
    py -3 server.py
    goto :done
  )
)

where python >nul 2>&1
if %errorlevel%==0 (
  python -c "import sys; raise SystemExit(0 if sys.version_info[0] == 3 else 1)" >nul 2>&1
  if %errorlevel%==0 (
    python server.py
    goto :done
  )
)

echo Python 3 is required to launch Tank Turf.
echo Install Python 3, then run this launcher again.
pause
exit /b 1

:done
if errorlevel 1 pause
exit /b %errorlevel%
