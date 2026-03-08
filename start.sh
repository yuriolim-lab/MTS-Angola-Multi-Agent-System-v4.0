#!/bin/sh
# MTS Angola - Production Start Script
# This script initializes the database and starts the server

set -e

echo "=========================================="
echo "🚀 MTS Angola Multi-Agent System v4.0"
echo "=========================================="

# Create data directory if it doesn't exist
mkdir -p /app/data

# Run database migrations
echo "📦 Setting up database..."
cd /app

# Try migrate first, fallback to push if no migrations
if npx prisma migrate deploy 2>/dev/null; then
    echo "✅ Migrations applied successfully"
else
    echo "📝 Pushing database schema..."
    npx prisma db push --accept-data-loss
    echo "✅ Database schema pushed"
fi

# Start the Next.js server
echo "✅ Starting server..."
exec node server.js
