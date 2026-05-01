# --- builder ---
FROM node:20.11.1-slim AS builder
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /repo

# Copy workspace manifests first for cache friendliness
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages packages
COPY apps/web apps/web

# Build args needed by Vite at build time (NOT at runtime; Vite inlines them)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL
ARG VITE_BRAND_NAME
ARG VITE_BRAND_PRIMARY_COLOR
ARG VITE_BRAND_PRIMARY_COLOR_HOVER
ARG VITE_BRAND_LOGO_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_BRAND_NAME=$VITE_BRAND_NAME
ENV VITE_BRAND_PRIMARY_COLOR=$VITE_BRAND_PRIMARY_COLOR
ENV VITE_BRAND_PRIMARY_COLOR_HOVER=$VITE_BRAND_PRIMARY_COLOR_HOVER
ENV VITE_BRAND_LOGO_URL=$VITE_BRAND_LOGO_URL

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @rh/web build

# --- runtime ---
FROM nginx:1.27-alpine
COPY --from=builder /repo/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# Use 127.0.0.1 (not "localhost"): busybox wget on alpine can resolve
# localhost to ::1 first, and nginx only binds 0.0.0.0:80 → Connection refused.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O - http://127.0.0.1/health || exit 1
