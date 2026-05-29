# syntax=docker/dockerfile:1.7
# ── Stage 1: System deps + npm install ───────────────────────────────────────
# This stage is cached FOREVER as long as package*.json doesn't change.
# canvas and sharp require native compilation — the apt layer is also cached.
FROM node:22-bookworm-slim AS deps

WORKDIR /app

ARG DEBIAN_FRONTEND=noninteractive

# ── System libraries for native modules (canvas, sharp) ───────────────────────
# Cached until this RUN changes — only re-runs when this layer is invalidated.
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 make g++ \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy only lockfile first — layer is invalidated ONLY when package.json changes
COPY package.json package-lock.json ./

# ── npm install with persistent cache mount ────────────────────────────────────
# --mount=type=cache keeps ~/.npm between builds → massive speedup on rebuilds
# Canvas/sharp are compiled here and cached — won't recompile unless package.json changes
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline

# ── Stage 2: TypeScript Build ─────────────────────────────────────────────────
FROM deps AS builder

COPY . .

# Build TypeScript — exclude test files via tsconfig.build.json
RUN --mount=type=cache,target=/root/.npm \
    npm run build

# Prune dev dependencies for smaller production image
RUN npm prune --omit=dev

# ── Stage 3: Runtime (slim — no build tools, no source) ──────────────────────
FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ARG DEBIAN_FRONTEND=noninteractive

# Runtime native libs only — no compilers, no build tools
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && \
    apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libjpeg62-turbo libgif7 librsvg2-2 \
      curl && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/false ngvms

# Copy built artifacts + production node_modules only
COPY --from=builder --chown=ngvms:nodejs /app/dist        ./dist
COPY --from=builder --chown=ngvms:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=ngvms:nodejs /app/package.json ./package.json

USER ngvms

ENV NODE_ENV=production \
    PORT=5000 \
    OTEL_SDK_DISABLED=false

EXPOSE 5000
EXPOSE 9464

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD ["curl", "-f", "http://localhost:5000/health"]

CMD ["node", "dist/server.js"]
