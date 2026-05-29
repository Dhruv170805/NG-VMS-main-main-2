# syntax=docker/dockerfile:1.7
# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Cache npm registry requests to speed up repeated builds
RUN --mount=type=cache,target=/root/.npm \
    npm install -g npm@latest --quiet

COPY package.json package-lock.json .npmrc* ./

# Install dependencies with cache mount
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline 2>/dev/null || npm install

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

# Copy all source code (node_modules is already inherited from deps)
COPY . .

# Build-time args
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_SOCKET_URL=/

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Build Next.js application, caching the Next.js build output
# This significantly speeds up rebuilds if only some pages/components change
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.next/cache \
    npm run build

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs nextjs

# Copy only what Next.js standalone needs (to minimize image size)
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

# Run the standalone server
CMD ["node", "server.js"]
