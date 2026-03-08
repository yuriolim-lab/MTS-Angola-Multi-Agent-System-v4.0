# MTS Angola Multi-Agent System - Production Dockerfile
# Fixed: Healthcheck with curl, proper startup sequence

# ========================================
# Stage 1: Dependencies
# ========================================
FROM oven/bun:1-alpine AS deps
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json bun.lock* ./
COPY prisma ./prisma/

RUN bun install --frozen-lockfile
RUN bunx prisma generate

# ========================================
# Stage 2: Build
# ========================================
FROM oven/bun:1-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl nodejs

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

RUN bun run build

# ========================================
# Stage 3: Production
# ========================================
FROM node:20-alpine AS production
WORKDIR /app

# Install curl for healthcheck + openssl for Prisma
RUN apk add --no-cache openssl curl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

# Copy standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

USER nextjs

EXPOSE 3000

# Health check: uses curl (available in image), long start-period for cold starts
HEALTHCHECK --interval=15s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1

# Startup: initialize database, then start server
# Uses sh -c for multi-command execution
CMD sh -c "npx prisma db push --skip-generate 2>/dev/null || true && exec node server.js"
