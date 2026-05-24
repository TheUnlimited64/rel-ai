# T085: toggleEndpoint No Concurrent Guard

## Phase: 3 — Frontend
## Depends on: T019
## Estimated effort: XS

## Description

`endpoints/hooks/useEndpoints.ts:38` — `toggleEnabled` reads `ep.enabled` from stale data. Rapid toggles send same mutation value. `isPending` not exposed to caller. No debouncing.

## Acceptance Criteria

- [ ] Expose `isPending` from toggleMutation
- [ ] Disable toggle button while pending
- [ ] Test: rapid double-click → single toggle, not two identical mutations

## Implementation Notes

- Return `isPending` from hook
- UI: `<Button disabled={isPending} onClick={toggle}>`
