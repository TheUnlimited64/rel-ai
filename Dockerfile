# Stage 1: Build frontend
FROM oven/bun:1 AS frontend-build

WORKDIR /app

# Install root dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy frontend source and build
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/
RUN cd packages/shared && bun install --frozen-lockfile 2>/dev/null || true
RUN cd packages/frontend && bun install --frozen-lockfile 2>/dev/null || true

COPY packages/shared/ packages/shared/
COPY packages/frontend/ packages/frontend/

RUN cd packages/frontend && bun run build

# Stage 2: Production image
FROM oven/bun:1

WORKDIR /app

# Install production dependencies only
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

# Copy shared package
COPY packages/shared/ packages/shared/

# Copy backend source
COPY packages/backend/package.json packages/backend/
COPY packages/backend/src/ packages/backend/src/
COPY packages/backend/drizzle.config.ts packages/backend/ 2>/dev/null || true

# Copy frontend build output to public directory for static serving
COPY --from=frontend-build /app/packages/frontend/dist/ public/

# Copy drizzle migrations
COPY packages/backend/src/db/migrations/ packages/backend/src/db/migrations/

EXPOSE 3000

CMD ["bun", "run", "start"]
