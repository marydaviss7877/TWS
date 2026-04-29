@echo off
REM ========================================
REM TWS Unified Server Orchestration
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

REM Color codes (for better visibility)
set "GREEN=[92m"
set "YELLOW=[93m"
set "RED=[91m"
set "BLUE=[94m"
set "RESET=[0m"

echo %BLUE%[INFO]%RESET% Current directory: %CD%
echo.

REM ========================================
REM 1. Check Prerequisites
REM ========================================
echo %BLUE%[STEP 1]%RESET% Checking prerequisites...
echo.

REM Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%RESET% Node.js not found!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo %GREEN%[OK]%RESET% Node.js found: 
node --version

REM Check npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR]%RESET% npm not found!
    pause
    exit /b 1
)
echo %GREEN%[OK]%RESET% npm found: 
npm --version
echo.

REM ========================================
REM 2. Check Dependencies
REM ========================================
echo %BLUE%[STEP 2]%RESET% Checking dependencies...
echo.

REM Check backend node_modules
if not exist "backend\node_modules" (
    echo %YELLOW%[WARNING]%RESET% Backend dependencies not installed
    echo %BLUE%[INFO]%RESET% Installing backend dependencies...
    cd backend
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo %RED%[ERROR]%RESET% Failed to install backend dependencies
        pause
        exit /b 1
    )
    cd ..
)

REM Check frontend node_modules
if not exist "frontend\node_modules" (
    echo %YELLOW%[WARNING]%RESET% Frontend dependencies not installed
    echo %BLUE%[INFO]%RESET% Installing frontend dependencies...
    cd frontend
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo %RED%[ERROR]%RESET% Failed to install frontend dependencies
        pause
        exit /b 1
    )
    cd ..
)

echo %GREEN%[OK]%RESET% All dependencies checked
echo.

REM ========================================
REM 3. Check Environment Configuration
REM ========================================
echo %BLUE%[STEP 3]%RESET% Checking environment configuration...
echo.

REM Check backend .env
if not exist "backend\.env" (
    echo %YELLOW%[WARNING]%RESET% Backend .env file not found
    echo %BLUE%[INFO]%RESET% Creating default .env file...
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
    echo %GREEN%[OK]%RESET% Default .env file created
    echo %YELLOW%[WARNING]%RESET% Please update backend\.env with your actual configuration
) else (
    echo %GREEN%[OK]%RESET% Backend .env file found
)

echo.

REM ========================================
REM 4. Start Services
REM ========================================
echo %BLUE%[STEP 4]%RESET% Starting services...
echo.

REM Create a log directory if it doesn't exist
if not exist "logs" mkdir logs

REM Start Backend Server
echo %BLUE%[INFO]%RESET% Starting Backend Server (Port 5000)...
start "TWS Backend Server" /MIN cmd /c "cd backend && npm start > ..\logs\backend.log 2>&1"
timeout /t 3 /nobreak >nul
echo %GREEN%[OK]%RESET% Backend server starting...
echo.

REM Start Frontend Server
echo %BLUE%[INFO]%RESET% Starting Frontend Server (Port 3000)...
start "TWS Frontend Server" /MIN cmd /c "cd frontend && npm start > ..\logs\frontend.log 2>&1"
timeout /t 3 /nobreak >nul
echo %GREEN%[OK]%RESET% Frontend server starting...
echo.

REM ========================================
REM 5. Wait for Services to Start
REM ========================================
echo %BLUE%[STEP 5]%RESET% Waiting for services to initialize...
echo.
echo %YELLOW%[INFO]%RESET% Waiting 10 seconds for services to start...
timeout /t 10 /nobreak >nul

REM ========================================
REM 6. Display Status
REM ========================================
echo.
echo ========================================
echo   Service Status
echo ========================================
echo.

REM Check if backend is responding
echo %BLUE%[INFO]%RESET% Checking backend health...
curl -s http://localhost:5000/health >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%[OK]%RESET% Backend is running on http://localhost:5000
) else (
    echo %YELLOW%[WARNING]%RESET% Backend may still be starting...
    echo %BLUE%[INFO]%RESET% Check logs\backend.log for details
)

REM Check if frontend is responding
echo %BLUE%[INFO]%RESET% Checking frontend health...
curl -s http://localhost:3000 >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%[OK]%RESET% Frontend is running on http://localhost:3000
) else (
    echo %YELLOW%[WARNING]%RESET% Frontend may still be starting...
    echo %BLUE%[INFO]%RESET% Check logs\frontend.log for details
)

echo.

REM ========================================
REM 7. Display Access Information
REM ========================================
echo.
echo ========================================
echo   Access Information
echo ========================================
echo.
echo %GREEN%Frontend:%RESET% http://localhost:3000
echo %GREEN%Backend API:%RESET% http://localhost:5000
echo %GREEN%Backend Health:%RESET% http://localhost:5000/health
echo.
echo %BLUE%Portals:%RESET%
echo   - Supra Admin: http://localhost:3000/supra-admin-login
echo   - Tenant Login: http://localhost:3000/login
echo   - Healthcare Login: http://localhost:3000/healthcare-login
echo   - Employee Login: http://localhost:3000/employee-login
echo   - Client Portal: http://localhost:3000/clients
echo.
echo %BLUE%Modules:%RESET%
echo   - Projects: http://localhost:3000/projects
echo   - HR: http://localhost:3000/hr
echo   - Finance: http://localhost:3000/finance
echo   - Operations: http://localhost:3000/operations
echo.
echo ========================================
echo   Log Files
echo ========================================
echo.
echo Backend logs: logs\backend.log
echo Frontend logs: logs\frontend.log
echo.
echo %YELLOW%[TIP]%RESET% To view logs in real-time, open the log files
echo %YELLOW%[TIP]%RESET% To stop services, close the minimized windows or use Task Manager
echo.

REM ========================================
REM 8. Optional: Open Browser
REM ========================================
echo %BLUE%[INFO]%RESET% Opening browser in 5 seconds...
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo %GREEN%[SUCCESS]%RESET% TWS system is now running
echo.
echo Press any key to exit this window (services will continue running)...
pause >nul

