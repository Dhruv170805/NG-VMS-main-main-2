# ── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS deps

WORKDIR /app

# Native build deps for canvas + sharp
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update --fix-missing && \
    apt-get install -y --fix-missing --no-install-recommends \
      python3 make g++ \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest --quiet

COPY package*.json ./
# Try frozen lockfile first, fall back for CI environments
RUN npm ci --frozen-lockfile 2>/dev/null || npm install

# ── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM deps AS builder

COPY . .
# Build TypeScript — exclude test files via tsconfig.build.json
RUN npm run build

# Prune dev dependencies
RUN npm prune --production

# ── Stage 3: Runtime ─────────────────────────────────────────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

# Runtime native libs only (no build tools)
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update --fix-missing && \
    apt-get install -y --fix-missing --no-install-recommends \
      libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      curl && \
    rm -rf /var/lib/apt/lists/* && \
    # Remove curl after healthcheck usage or keep for diagnostics
    apt-get clean

# Non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/false ngvms

# Copy built artifacts + production node_modules only
COPY --from=builder --chown=ngvms:nodejs /app/dist ./dist
COPY --from=builder --chown=ngvms:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ngvms:nodejs /app/package.json ./package.json

# Drop to non-root
USER ngvms

# Environment defaults (override via docker-compose or env injection)
ENV NODE_ENV=production \
    PORT=5000 \
    # Prevent OTEL from crashing if collector unreachable
    OTEL_SDK_DISABLED=false

EXPOSE 5000

# Prometheus metrics port
EXPOSE 9464

# Healthcheck via /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["curl", "-f", "http://localhost:5000/health"]

CMD ["node", "dist/server.js"]
