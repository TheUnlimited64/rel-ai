# T024: Docker Compose Setup

## Phase: 4 — Polish
## Depends on: T014
## Estimated effort: S

## Description

Dockerfile and docker-compose.yml for homelab deployment. Single container: Bun serves backend + static frontend assets.

## Acceptance Criteria

- [ ] `Dockerfile`:
  - [ ] Multi-stage build: build frontend → build backend → production image
  - [ ] Based on `oven/bun` image
  - [ ] Production image runs `bun run start`
  - [ ] Frontend built to `dist/` and served by Hono static middleware
- [ ] `docker-compose.yml`:
  - [ ] Single service: `rel-ai`
  - [ ] Port: `3000:3000`
  - [ ] Volume: `rel-ai-data:/app/data` for SQLite + logs
  - [ ] Env vars: `ENCRYPTION_KEY`
  - [ ] Restart policy: `unless-stopped`
- [ ] `.env.example` with required vars documented
- [ ] Hono serves static frontend from `dist/`
- [ ] On first run without `ENCRYPTION_KEY`:
  - [ ] Auto-generates one
  - [ ] Prints to stdout (one-time)
  - [ ] Persists to data volume
- [ ] Health check endpoint: `GET /health` → `{ status: "ok" }`
- [ ] Test: `docker compose up` starts successfully
- [ ] Test: admin UI loads at `http://localhost:3000`
- [ ] Test: proxy endpoint accessible

## Implementation Notes

- Hono `serveStatic` for frontend assets
- Single port for both API and UI
- SQLite file in `/app/data/rel-ai.db` on volume
