# --- builder ---
FROM node:20.11.1-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
COPY apps/jobs apps/jobs
RUN pnpm install --frozen-lockfile
# The worker imports from @rh/api source files (claude-from-api, calendly-from-api),
# so apps/api must be present and built so its TS resolves.
RUN pnpm --filter @rh/api build
RUN pnpm --filter @rh/jobs build

# --- runtime ---
FROM node:20.11.1-slim
WORKDIR /repo
COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/packages /repo/packages
COPY --from=builder /repo/apps/api /repo/apps/api
COPY --from=builder /repo/apps/jobs /repo/apps/jobs
WORKDIR /repo/apps/jobs
ENV NODE_ENV=production
# No HTTP port — pg-boss healthcheck via process liveness only.
HEALTHCHECK --interval=60s --timeout=5s --start-period=15s --retries=3 \
  CMD pgrep -f "tsx" >/dev/null || exit 1
# Run from TS sources via tsx (same reason as apps/api/Dockerfile).
CMD ["node", "--import", "tsx", "src/index.ts"]
