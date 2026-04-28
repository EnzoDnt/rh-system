# --- builder ---
FROM node:20.11.1-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages packages
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rh/api build

# --- runtime ---
FROM node:20.11.1-slim
WORKDIR /repo
COPY --from=builder /repo/node_modules /repo/node_modules
COPY --from=builder /repo/packages /repo/packages
COPY --from=builder /repo/apps/api /repo/apps/api
WORKDIR /repo/apps/api
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"
# Run from TS sources via tsx — workspace packages (@rh/config, @rh/db, @rh/types)
# expose `main: ./src/index.ts` for dev convenience, so node can't load them directly.
# tsx hooks the ESM loader to handle .ts on the fly. It's already in devDeps.
CMD ["node", "--import", "tsx", "src/index.ts"]
