@echo off
REM Double-click: serves the gallery and opens it in your browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing dependencies first...
  call npm install || goto :err
)
start "" http://localhost:4173
node scripts/serve.mjs
goto :eof
:err
echo.
echo npm install failed - see 00-START-HERE.md step 3.
pause
