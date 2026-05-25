# T087: Hot-Reloadable Dev Workflow

## Phase: 1 — DX / Infrastructure
## Depends on: None
## Estimated effort: S

## Description

No reloadable dev workflow exists. Every change requires Docker container restart. Backend runs `bun run src/index.ts` with no watch flag. Docker setup is production-only (no source bind mounts).

**Current state:**
- Frontend: Vite HMR works via `bun dev` in `packages/frontend/`, but only if run outside Docker
- Backend: `packages/backend/package.json` `"start": "bun run src/index.ts"` — no `--watch`, no dev script
- Docker: `docker-compose.yml` has no source volume mounts; `Dockerfile` is multi-stage production build

**Goal:** Both backend and frontend auto-reload on source changes during development. Two paths: (A) run natively outside Docker, (B) docker-compose dev override with source mounts.

## Acceptance Criteria

- [ ] Backend `package.json` has `"dev": "bun --watch src/index.ts"` script
- [ ] Root `package.json` has `"dev": "bun run --filter '*' dev"` (or equivalent) to run both workspaces
- [ ] `docker-compose.dev.yml` override file exists with:
  - [ ] Backend service mounts `packages/backend/src` as bind volume
  - [ ] Frontend service mounts `packages/frontend/src` as bind volume
  - [ ] Backend command uses `bun --watch`
  - [ ] Frontend command uses Vite dev server with HMR
  - [ ] Environment variables passed through (same as `docker-compose.yml`)
- [ ] `docker-compose.dev.yml` usable via `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
- [ ] Documentation: README or comment explains dev workflow (native vs Docker dev)
- [ ] Frontend Vite dev server can proxy API requests to backend in both native and Docker dev modes

## Implementation Notes

### Backend `--watch`

Bun's `--watch` flag restarts the process on file changes. Add to `packages/backend/package.json`:

```json
"scripts": {
  "dev": "bun --watch src/index.ts",
  "start": "bun run src/index.ts"
}
```

### Root dev script

Use Bun workspace filter to run both packages' dev scripts concurrently:

```json
"dev": "bun run --filter './packages/*' dev"
```

Or use `concurrently` / `npm-run-all` if parallel output interleaving is problematic.

### Docker compose dev override

Create `docker-compose.dev.yml` alongside `docker-compose.yml`:

```yaml
services:
  backend:
    command: bun --watch src/index.ts
    volumes:
      - ./packages/backend/src:/app/packages/backend/src
    environment:
      - NODE_ENV=development

  frontend:
    command: bun run dev --host 0.0.0.0
    volumes:
      - ./packages/frontend/src:/app/packages/frontend/src
      - ./packages/frontend/index.html:/app/packages/frontend/index.html
    environment:
      - NODE_ENV=development
```

Run with: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`

### Vite proxy config

`packages/frontend/vite.config.ts` already proxies `/api` → `http://localhost:3000`. In Docker dev mode, backend service name replaces `localhost`:

```typescript
proxy: {
  '/api': {
    target: process.env.DOCKER ? 'http://backend:3000' : 'http://localhost:3000',
    changeOrigin: true,
  }
}
```

Or rely on Docker network DNS (service name `backend`) when running in Docker.

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/backend/package.json` | Add `"dev"` script |
| `package.json` | Add root `"dev"` script |
| `docker-compose.dev.yml` | Create — dev override |
| `packages/frontend/vite.config.ts` | Possibly adjust proxy target for Docker |
