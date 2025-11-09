#!/bin/bash

# Production Start Script for Dialogue Evaluation System
# This script starts both backend and frontend in production mode

set -e  # Exit on error

echo "=========================================="
echo "Dialogue Evaluation System - Production"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}Error: Node.js version 16 or higher is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node -v)${NC}"
echo ""

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}Warning: Port $1 is already in use${NC}"
        read -p "Do you want to kill the process using port $1? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            lsof -ti:$1 | xargs kill -9 2>/dev/null || true
            sleep 1
        else
            echo -e "${RED}Exiting. Please free port $1 first.${NC}"
            exit 1
        fi
    fi
}

# Check ports
check_port 5001
check_port 3000

# Backend setup
echo "Setting up backend..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install --production
fi

# Check if database exists, if not it will be created on startup
if [ ! -f "database.sqlite" ]; then
    echo -e "${YELLOW}Database not found. It will be created on first run.${NC}"
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
PORT=5001
JWT_SECRET=$(openssl rand -hex 32)
NODE_ENV=production
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Start backend
echo "Starting backend server..."
npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 5

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}Backend failed to start. Check backend.log for details.${NC}"
    exit 1
fi

# Test backend
if curl -s http://localhost:5001/api/login > /dev/null 2>&1 || curl -s http://localhost:5001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running on port 5001${NC}"
else
    echo -e "${YELLOW}Backend may still be starting...${NC}"
fi

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

# Build frontend for production
if [ ! -d "build" ]; then
    echo "Building frontend for production..."
    npm run build
fi

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
REACT_APP_API_URL=http://localhost:5001/api
EOF
    echo -e "${GREEN}✓ Created .env file${NC}"
fi

# Start frontend (production build with serve)
if command -v serve &> /dev/null; then
    echo "Starting frontend server (production build)..."
    serve -s build -l 3000 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
else
    echo "Installing 'serve' package to serve production build..."
    npm install -g serve
    serve -s build -l 3000 > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
fi
cd ..

# Wait for frontend to start
sleep 3

# Check if frontend started successfully
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}Frontend failed to start. Check frontend.log for details.${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Both servers are running!${NC}"
echo "=========================================="
echo ""
echo "Backend:  http://localhost:5001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  tail -f backend.log"
echo "  Frontend: tail -f frontend.log"
echo ""
echo "To stop servers:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "  Or: ./stop.sh"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    echo "Servers stopped."
    exit 0
}

trap cleanup INT TERM

# Wait for processes
wait

