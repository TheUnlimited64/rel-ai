# Stage 1: Build frontend
# Pinned: oven/bun:1.3.14-alpine (2025-05-25). Update by: bun --version → update tag → rebuild
FROM oven/bun:1.3.14-alpine AS frontend-build

WORKDIR /app

# Copy all workspace package.json files first so root install can resolve workspace deps
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN bun install --frozen-lockfile

# Copy frontend source and build
RUN cd packages/shared && bun install --frozen-lockfile 2>/dev/null || true
RUN cd packages/frontend && bun install --frozen-lockfile 2>/dev/null || true

COPY tsconfig.base.json ./
COPY packages/backend/src/ packages/backend/src/
COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

RUN cd packages/frontend && bun run build

# Stage 2: Production image
# Pinned: oven/bun:1.3.14-alpine (2025-05-25). Update by: bun --version → update tag → rebuild
FROM oven/bun:1.3.14-alpine

WORKDIR /app

# Install production dependencies only
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
COPY packages/backend/package.json packages/backend/
RUN bun install --frozen-lockfile --production

# Copy shared package
COPY packages/shared/ packages/shared/

# Copy backend source
COPY packages/backend/src/ packages/backend/src/
COPY packages/backend/drizzle.config.ts packages/backend/

# Copy frontend build output to public directory for static serving
COPY --from=frontend-build /app/packages/frontend/dist/ packages/backend/public/

# Copy drizzle migrations
COPY packages/backend/src/db/migrations/ packages/backend/src/db/migrations/

EXPOSE 3000

CMD ["bun", "run", "start"]
