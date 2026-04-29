@echo off
REM ========================================
REM TWS Unified Server Orchestration (Fixed)
REM Starts all frontend and backend servers
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   TWS Unified Server Orchestration
echo   Starting All Services...
echo ========================================
echo.

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

echo [INFO] Current directory: %CD%
echo.

REM ========================================
REM 0. Add Node.js to PATH
REM ========================================
echo [STEP 0] Adding Node.js to PATH...
set "NODEJS_PATH=C:\Program Files\nodejs"
if exist "%NODEJS_PATH%\node.exe" (
    set "PATH=%NODEJS_PATH%;%PATH%"
    echo [OK] Node.js found at: %NODEJS_PATH%
) else (
    echo [ERROR] Node.js not found at: %NODEJS_PATH%
    echo [INFO] Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo.

REM ========================================
REM 1. Check Prerequisites
REM ========================================
echo [STEP 1] Checking prerequisites...
echo.

REM Check Node.js
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not found in PATH!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Or add Node.js to your system PATH
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js version:
node --version

REM Check npm
npm --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm not found!
    pause
    exit /b 1
)
echo [OK] npm version:
npm --version
echo.

REM ========================================
REM 2. Check Dependencies
REM ========================================
echo [STEP 2] Checking dependencies...
echo.

REM Check backend node_modules
if not exist "backend\node_modules" (
    echo [WARNING] Backend dependencies not installed
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Backend dependencies installed
) else (
    echo [OK] Backend dependencies found
)

REM Check frontend node_modules
if not exist "frontend\node_modules" (
    echo [WARNING] Frontend dependencies not installed
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Frontend dependencies installed
) else (
    echo [OK] Frontend dependencies found
)
echo.

REM ========================================
REM 3. Check Environment Configuration
REM ========================================
echo [STEP 3] Checking environment configuration...
echo.

REM Check backend .env
if not exist "backend\.env" (
    echo [WARNING] Backend .env file not found
    echo [INFO] Creating default .env file...
    (
        echo # MongoDB Connection String
        echo MONGO_URI=mongodb+srv://subhan:U3SNm3nRjvtHMiN7@cluster0.rlfss7x.mongodb.net/wolfstack
        echo.
        echo # JWT Secrets
        echo JWT_SECRET=your-super-secure-jwt-secret-at-least-64-characters-long-for-development
        echo JWT_REFRESH_SECRET=your-super-secure-refresh-secret-at-least-64-characters-long-for-development
        echo.
        echo # Environment
        echo NODE_ENV=development
        echo PORT=5000
        echo.
        echo # Frontend URL
        echo BASE_URL=http://localhost:3000
        echo SOCKET_CORS_ORIGIN=http://localhost:3000
    ) > backend\.env
    echo [OK] Default .env file created
    echo [WARNING] Please update backend\.env with your actual configuration
) else (
    echo [OK] Backend .env file found
)
echo.

REM ========================================
REM 4. Create Log Directory
REM ========================================
if not exist "logs" mkdir logs
echo [OK] Log directory ready
echo.

REM ========================================
REM 5. Start Services
REM ========================================
echo [STEP 4] Starting services...
echo.

REM Start Backend Server
echo [INFO] Starting Backend Server (Port 5000)...
echo [INFO] Backend will run in a new window...
start "TWS Backend Server" cmd /k "cd /d %CD%\backend && node server.js"
timeout /t 5 /nobreak >nul
echo [OK] Backend server starting...
echo.

REM Start Frontend Server
echo [INFO] Starting Frontend Server (Port 3000)...
echo [INFO] Frontend will run in a new window...
start "TWS Frontend Server" cmd /k "cd /d %CD%\frontend && npm start"
timeout /t 5 /nobreak >nul
echo [OK] Frontend server starting...
echo.

REM ========================================
REM 6. Display Access Information
REM ========================================
echo.
echo ========================================
echo   Services Starting...
echo ========================================
echo.
echo Please wait 10-30 seconds for services to fully start...
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo Backend Health: http://localhost:5000/health
echo.
echo ========================================
echo   Portals
echo ========================================
echo.
echo - Supra Admin: http://localhost:3000/supra-admin-login
echo - Tenant Login: http://localhost:3000/login
echo - Healthcare Login: http://localhost:3000/healthcare-login
echo - Employee Login: http://localhost:3000/employee-login
echo - Client Portal: http://localhost:3000/clients
echo.
echo ========================================
echo   Modules
echo ========================================
echo.
echo - Projects: http://localhost:3000/projects
echo - HR: http://localhost:3000/hr
echo - Finance: http://localhost:3000/finance
echo - Operations: http://localhost:3000/operations
echo.
echo ========================================
echo   Server Windows
echo ========================================
echo.
echo Two new windows have been opened:
echo 1. "TWS Backend Server" - Backend server (Port 5000)
echo 2. "TWS Frontend Server" - Frontend server (Port 3000)
echo.
echo To stop servers: Close the server windows
echo.
echo ========================================
echo.
echo Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo [SUCCESS] Services started!
echo.
echo The servers are running in separate windows.
echo Close those windows to stop the servers.
echo.
pause

