# T044: No CORS Configuration

## Phase: 5 — Security Hardening
## Depends on: T024
## Estimated effort: S

## Description

No CORS middleware anywhere in the Hono app. Any origin can call:
- `/v1/*` proxy endpoints (bypass API keys)
- `/api/trpc/*` admin routes (bypass auth)

Browser same-origin policy only protects against *reads* — but CORS headers are missing, so browser allows all cross-origin requests by default (no `Access-Control-Allow-Origin` = browser blocks, but no explicit deny either). Missing configuration means no control over which origins can interact.

## Acceptance Criteria

- [ ] Add `hono/cors` middleware to app
- [ ] Admin API routes (`/api/trpc/*`): restrict to same origin or explicit allowlist
- [ ] Proxy routes (`/v1/*`): allow all origins (API consumers need cross-origin access)
- [ ] Configurable `CORS_ORIGIN` env var
- [ ] Test: cross-origin request to admin API from unknown origin → blocked
- [ ] Test: same-origin request to admin API → allowed

## Implementation Notes

- Hono cors middleware: `import { cors } from 'hono/cors'`
- Apply stricter CORS to `/api/trpc/*`, permissive to `/v1/*`
- Consider `Access-Control-Allow-Headers: Authorization` for proxy routes
