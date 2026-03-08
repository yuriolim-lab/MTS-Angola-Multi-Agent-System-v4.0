# MTS Angola Multi-Agent System - Simple Dockerfile for Railway
# Uses Bun for everything (install, build, runtime)

FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl nodejs

# Copy all files
COPY . .

# Install dependencies and generate Prisma
RUN bun install
RUN bunx prisma generate

# Build
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1
RUN bun run build

# Create data directory
RUN mkdir -p /app/data

# Environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start with database setup
CMD ["sh", "-c", "bunx prisma migrate deploy || bunx prisma db push && node .next/standalone/server.js"]
