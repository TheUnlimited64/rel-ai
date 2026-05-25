# T076: No Docker Healthcheck, Restart Policy, or Resource Limits

## Phase: 5 — Security Hardening
## Depends on: T024
## Estimated effort: XS

## Description

`docker-compose.yml` missing:
1. No `restart` policy — container won't restart on crash
2. No healthcheck — `/health` endpoint exists but unused by compose
3. No resource limits — single container can consume all host resources

## Acceptance Criteria

- [ ] Add `restart: unless-stopped`
- [ ] Add healthcheck: `curl -f http://localhost:3000/health` with 30s interval
- [ ] Add basic resource limits (mem_limit, cpus)
- [ ] Test: `docker compose up` → container restarts on crash

## Implementation Notes

- Healthcheck: `test: ["CMD", "curl", "-f", "http://localhost:3000/health"], interval: 30s, timeout: 5s, retries: 3`
- May need `curl` in Docker image — use `wget` or Bun fetch instead
