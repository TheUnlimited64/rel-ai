# T080: NODE_ENV=production Not Set in Docker Compose

## Phase: 4 — Polish
## Depends on: T024
## Estimated effort: XS

## Description

`docker-compose.yml` doesn't set `NODE_ENV=production`. `server.ts:168` checks for production mode to warn about ENCRYPTION_KEY but compose never sets it. Warning never fires.

## Acceptance Criteria

- [ ] Add `NODE_ENV=production` to compose environment
- [ ] Key warning fires on misconfiguration
- [ ] Test: docker compose up without ENCRYPTION_KEY → warning shown

## Implementation Notes

- Single line in compose: `NODE_ENV: production`
