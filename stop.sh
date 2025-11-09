#!/bin/bash

# Stop script for Dialogue Evaluation System

echo "Stopping Dialogue Evaluation System..."

# Kill backend
if lsof -ti:5001 > /dev/null 2>&1; then
    lsof -ti:5001 | xargs kill -9 2>/dev/null
    echo "✓ Stopped backend server"
else
    echo "- Backend server not running"
fi

# Kill frontend
if lsof -ti:3000 > /dev/null 2>&1; then
    lsof -ti:3000 | xargs kill -9 2>/dev/null
    echo "✓ Stopped frontend server"
else
    echo "- Frontend server not running"
fi

# Kill any node processes related to this project
pkill -f "dialogue-evaluation" 2>/dev/null || true

echo "Done!"

