#!/bin/sh
# MTS Angola - Startup Script for Railway
# This script ensures database is ready before starting the server

set -e

echo "=========================================="
echo "🚀 MTS Angola Multi-Agent System v4.0"
echo "=========================================="
echo "Environment: $NODE_ENV"
echo "Port: $PORT"

# Wait for filesystem to be ready
sleep 2

# Create data directory for SQLite
mkdir -p /app/data
echo "✅ Data directory ready"

# Run database migrations
echo "📦 Setting up database..."
cd /app

# Try migrate first, fallback to push if no migrations exist
if [ -d "prisma/migrations" ]; then
    echo "Running Prisma migrations..."
    npx prisma migrate deploy || npx prisma db push --accept-data-loss
else
    echo "Pushing database schema..."
    npx prisma db push --accept-data-loss
fi

echo "✅ Database ready"

# Start the server
echo "✅ Starting server..."
exec node server.js
