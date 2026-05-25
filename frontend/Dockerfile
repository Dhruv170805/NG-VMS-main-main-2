# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

RUN npm install -g npm@latest --quiet

COPY package*.json .npmrc ./
RUN npm ci --frozen-lockfile 2>/dev/null || npm install

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time args — injected by docker-compose build args
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_SOCKET_URL=/

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# next.config.js output: 'standalone' must be set — verified in repo
RUN npm run build

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

# Copy only what Next.js standalone needs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# face-api models must be in /public/models — copy from builder
# Ensure frontend/public/models/ exists in source before build
# COPY --from=builder /app/public/models ./public/models

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD ["node", "-e", "require('http').get('http://localhost:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"]

# Next.js standalone server
CMD ["node", "server.js"]
