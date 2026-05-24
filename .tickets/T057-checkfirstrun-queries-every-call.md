# T057: checkFirstRun Queries on Every tRPC Call

## Phase: 5 — Quality
## Depends on: T010
## Estimated effort: XS

## Description

`api/routers/auth.ts:10-12` + `core/auth/first-run.ts:10-16` — `checkFirstRun` runs two full table scans (authTokens, providers) on every `isFirstRun` tRPC call. Should be cached.

## Acceptance Criteria

- [ ] Cache `isFirstRun` result with TTL (e.g. 60s) or compute once at startup
- [ ] Invalidate when first provider is created (trigger in provider create handler)
- [ ] Test: second call returns cached result (no DB query)

## Implementation Notes

- Simple in-memory flag: `let cached: boolean | null = null`
- Reset flag on provider creation
- Or: compute at startup, store on app context
