@echo off
setlocal
title ChromaMeld RGBA Library Manager

set "APP_ROOT=%~dp0"
if not exist "%APP_ROOT%tools\library-manager\server.mjs" set "APP_ROOT=%USERPROFILE%\OneDrive\Documents\ChatGPT\filter-fabjs"
if defined FILTER_FABJS_APP_ROOT set "APP_ROOT=%FILTER_FABJS_APP_ROOT%"

if not exist "%APP_ROOT%\tools\library-manager\server.mjs" (
  echo ERROR: Cannot find the ChromaMeld RGBA app checkout.
  echo Keep this launcher in the app folder, or set FILTER_FABJS_APP_ROOT to the app folder.
  pause
  exit /b 1
)

pushd "%APP_ROOT%"
if errorlevel 1 (
  echo ERROR: Cannot open the ChromaMeld RGBA folder.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Node.js 22 or newer and make sure node is on PATH.
  popd
  pause
  exit /b 1
)

where git >nul 2>&1
if errorlevel 1 (
  echo ERROR: Install Git for Windows and make sure git is on PATH.
  popd
  pause
  exit /b 1
)

echo Starting ChromaMeld RGBA Library Manager...
echo Open the local URL printed below in your browser.
echo Keep this window open while using the Manager. Press Ctrl+C to stop.
echo.

if "%~1"=="" (
  node "tools\library-manager\server.mjs" --library-root "..\filter-fabjs-library"
) else (
  node "tools\library-manager\server.mjs" %*
)
set "MANAGER_EXIT=%ERRORLEVEL%"
popd

if not "%MANAGER_EXIT%"=="0" (
  echo.
  echo Library Manager stopped with an error. Review the message above.
  echo The default library folder is filter-fabjs-library beside this app folder.
  pause
)

endlocal & exit /b %MANAGER_EXIT%
