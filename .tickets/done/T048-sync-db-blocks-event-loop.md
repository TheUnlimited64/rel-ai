# T048: Sync DB Calls Block Event Loop in Async Functions

## Phase: 5 — Quality
## Depends on: T003
## Estimated effort: M

## Description

`core/endpoint/service.ts:102-126`, `core/provider/service.ts:82-90`, and others use sync Drizzle methods (`.all()`, `.get()`, `.run()`) with Bun:SQLite. Functions declared `async` but operations are synchronous — under load, blocks event loop.

Acceptable for SQLite homelab scale, but documented tradeoff missing.

## Acceptance Criteria

- [ ] Document tradeoff: sync SQLite OK for homelab scale, blocks at ~100+ concurrent
- [ ] OR: migrate to async drizzle driver (`drizzle-orm/bun-sqlite`) for true async
- [ ] If keeping sync: remove misleading `async` where result is always sync

## Implementation Notes

- Async driver: `import { drizzle } from 'drizzle-orm/bun-sqlite'`
- Requires testing all DB operations with async API
- Low priority — SQLite on local disk is fast enough for homelab
