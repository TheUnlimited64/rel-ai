# T066: Date.now() for Timing Instead of performance.now()

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: XS

## Description

`core/proxy/handler.ts:54` and multiple locations use `Date.now()` for latency timing. `Date.now()` has ~1ms resolution on some platforms. `performance.now()` provides sub-millisecond accuracy.

## Acceptance Criteria

- [ ] Replace `Date.now()` with `performance.now()` for timing measurements
- [ ] Low priority — acceptable for proxy latency tracking

## Implementation Notes

- `performance.now()` available in Bun runtime
- Only change timing code, not timestamp code (created_at fields should still use `Date.now()`)
