# T083: Frontend Package.json Unnecessarily in Docker Production Stage

## Phase: 4 — Polish
## Depends on: T024
## Estimated effort: XS

## Description

`Dockerfile:33` copies `packages/frontend/package.json` into production stage. Frontend is build-only — only build output needed. Wastes image space, widens attack surface.

## Acceptance Criteria

- [ ] Remove frontend package.json from production stage
- [ ] Only copy backend + shared package.json + built frontend dist

## Implementation Notes

- Review COPY lines in production stage — remove frontend package.json
