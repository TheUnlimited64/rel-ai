# Stage 1: Build frontend
# Pinned: oven/bun:1.3.14-alpine (2025-05-25). Update by: bun --version → update tag → rebuild
FROM oven/bun:1.3.14-alpine AS frontend-build

WORKDIR /app

# Copy all workspace package.json files first so root install can resolve workspace deps
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN bun install

# Copy frontend source and build
RUN cd packages/shared && bun install
RUN cd packages/frontend && bun install

COPY tsconfig.base.json ./
COPY packages/backend/src/ packages/backend/src/
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

RUN rm -rf packages/backend/public && cd packages/frontend && bun run build

# Stage 2: Production image
# Pinned: oven/bun:1.3.14-alpine (2025-05-25). Update by: bun --version → update tag → rebuild
FROM oven/bun:1.3.14-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install production dependencies only
COPY package.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN bun install --production

# Copy shared package
COPY packages/shared/ packages/shared/

# Copy backend source
COPY packages/backend/src/ packages/backend/src/
COPY packages/backend/drizzle.config.ts packages/backend/

# Copy frontend build output to public directory for static serving
COPY --from=frontend-build /app/packages/backend/public/ packages/backend/public/

# Copy drizzle migrations
COPY packages/backend/src/db/migrations/ packages/backend/src/db/migrations/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["bun", "run", "start"]
