# T072: mapServiceError Only Catches Sync Errors

## Phase: 5 — Quality
## Depends on: T013
## Estimated effort: XS

## Description

`api/routers/models.ts:56-85` — `mapServiceError<T>(fn: () => T | Promise<T>): Promise<T>` wraps in try/catch. If `fn()` is async and rejects, `try/catch` doesn't catch — promise rejection bubbles up unmapped. Current callers are sync, but signature advertises async support. Latent bug.

## Acceptance Criteria

- [ ] Use async/await: `try { return await fn(); } catch { ... }`
- [ ] Test: async function throwing → mapped error, not unhandled rejection

## Implementation Notes

- Single fix: `return Promise.resolve(fn())` → `return await fn()`
