#!/bin/bash
# ========================================
# TWS Unified Server Orchestration
# Starts all frontend and backend servers
# ========================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo ""
echo "========================================"
echo "  TWS Unified Server Orchestration"
echo "  Starting All Services..."
echo "========================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}[INFO]${RESET} Current directory: $(pwd)"
echo ""

# ========================================
# 1. Check Prerequisites
# ========================================
echo -e "${BLUE}[STEP 1]${RESET} Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${RESET} Node.js not found!"
    echo ""
    echo "Please install Node.js from: https://nodejs.org/"
    echo ""
    exit 1
fi
echo -e "${GREEN}[OK]${RESET} Node.js found: $(node --version)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[ERROR]${RESET} npm not found!"
    exit 1
fi
echo -e "${GREEN}[OK]${RESET} npm found: $(npm --version)"
echo ""

# ========================================
# 2. Check Dependencies
# ========================================
echo -e "${BLUE}[STEP 2]${RESET} Checking dependencies..."
echo ""

# Check backend node_modules
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}[WARNING]${RESET} Backend dependencies not installed"
    echo -e "${BLUE}[INFO]${RESET} Installing backend dependencies..."
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${RESET} Failed to install backend dependencies"
        exit 1
    fi
    cd ..
fi

# Check frontend node_modules
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}[WARNING]${RESET} Frontend dependencies not installed"
    echo -e "${BLUE}[INFO]${RESET} Installing frontend dependencies..."
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${RESET} Failed to install frontend dependencies"
        exit 1
    fi
    cd ..
fi

echo -e "${GREEN}[OK]${RESET} All dependencies checked"
echo ""

# ========================================
# 3. Check Environment Configuration
# ========================================
echo -e "${BLUE}[STEP 3]${RESET} Checking environment configuration..."
echo ""

# Check backend .env
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}[WARNING]${RESET} Backend .env file not found"
    echo -e "${BLUE}[INFO]${RESET} Creating default .env file..."
    cat > backend/.env << EOF
# MongoDB Connection String
MONGO_URI=mongodb+srv://subhan:U3SNm3nRjvtHMiN7@cluster0.rlfss7x.mongodb.net/wolfstack

# JWT Secrets
JWT_SECRET=your-super-secure-jwt-secret-at-least-64-characters-long-for-development
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-at-least-64-characters-long-for-development

# Environment
NODE_ENV=development
PORT=5000

# Frontend URL
BASE_URL=http://localhost:3000
SOCKET_CORS_ORIGIN=http://localhost:3000
EOF
    echo -e "${GREEN}[OK]${RESET} Default .env file created"
    echo -e "${YELLOW}[WARNING]${RESET} Please update backend/.env with your actual configuration"
else
    echo -e "${GREEN}[OK]${RESET} Backend .env file found"
fi

echo ""

# ========================================
# 4. Create Log Directory
# ========================================
if [ ! -d "logs" ]; then
    mkdir -p logs
fi

# ========================================
# 5. Start Services
# ========================================
echo -e "${BLUE}[STEP 4]${RESET} Starting services..."
echo ""

# Start Backend Server
echo -e "${BLUE}[INFO]${RESET} Starting Backend Server (Port 5000)..."
cd backend
npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}[OK]${RESET} Backend server starting (PID: $BACKEND_PID)"
echo ""

# Wait a bit for backend to start
sleep 3

# Start Frontend Server
echo -e "${BLUE}[INFO]${RESET} Starting Frontend Server (Port 3000)..."
cd frontend
npm start > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo -e "${GREEN}[OK]${RESET} Frontend server starting (PID: $FRONTEND_PID)"
echo ""

# ========================================
# 6. Wait for Services to Start
# ========================================
echo -e "${BLUE}[STEP 5]${RESET} Waiting for services to initialize..."
echo ""
echo -e "${YELLOW}[INFO]${RESET} Waiting 10 seconds for services to start..."
sleep 10

# ========================================
# 7. Display Status
# ========================================
echo ""
echo "========================================"
echo "  Service Status"
echo "========================================"
echo ""

# Check if backend is responding
echo -e "${BLUE}[INFO]${RESET} Checking backend health..."
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${RESET} Backend is running on http://localhost:5000"
else
    echo -e "${YELLOW}[WARNING]${RESET} Backend may still be starting..."
    echo -e "${BLUE}[INFO]${RESET} Check logs/backend.log for details"
fi

# Check if frontend is responding
echo -e "${BLUE}[INFO]${RESET} Checking frontend health..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}[OK]${RESET} Frontend is running on http://localhost:3000"
else
    echo -e "${YELLOW}[WARNING]${RESET} Frontend may still be starting..."
    echo -e "${BLUE}[INFO]${RESET} Check logs/frontend.log for details"
fi

echo ""

# ========================================
# 8. Display Access Information
# ========================================
echo ""
echo "========================================"
echo "  Access Information"
echo "========================================"
echo ""
echo -e "${GREEN}Frontend:${RESET} http://localhost:3000"
echo -e "${GREEN}Backend API:${RESET} http://localhost:5000"
echo -e "${GREEN}Backend Health:${RESET} http://localhost:5000/health"
echo ""
echo -e "${BLUE}Portals:${RESET}"
echo "  - Supra Admin: http://localhost:3000/supra-admin-login"
echo "  - Tenant Login: http://localhost:3000/login"
echo "  - Healthcare Login: http://localhost:3000/healthcare-login"
echo "  - Employee Login: http://localhost:3000/employee-login"
echo "  - Client Portal: http://localhost:3000/clients"
echo ""
echo -e "${BLUE}Modules:${RESET}"
echo "  - Projects: http://localhost:3000/projects"
echo "  - HR: http://localhost:3000/hr"
echo "  - Finance: http://localhost:3000/finance"
echo "  - Operations: http://localhost:3000/operations"
echo ""
echo "========================================"
echo "  Log Files"
echo "========================================"
echo ""
echo "Backend logs: logs/backend.log"
echo "Frontend logs: logs/frontend.log"
echo ""
echo -e "${YELLOW}[TIP]${RESET} To view logs in real-time: tail -f logs/backend.log"
echo -e "${YELLOW}[TIP]${RESET} To stop services: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# ========================================
# 9. Optional: Open Browser
# ========================================
echo -e "${BLUE}[INFO]${RESET} Opening browser in 5 seconds..."
sleep 5

# Try to open browser (works on most Linux/Mac systems)
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

echo ""
echo "========================================"
echo "  All Services Started!"
echo "========================================"
echo ""
echo -e "${GREEN}[SUCCESS]${RESET} TWS system is now running"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop all services..."
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Keep script running
wait

