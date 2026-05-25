# T075: parseDependents Regex — Fragile Error Format Coupling

## Phase: 3 — Frontend
## Depends on: T020
## Estimated effort: XS

## Description

`models/useModels.ts:6-11` — parses `HAS_DEPENDENTS:model1,model2` from error message string. Backend format change breaks regex silently → user sees generic error.

## Acceptance Criteria

- [ ] Use structured error data from tRPC error shape instead of string parsing
- [ ] Backend returns dependents in `error.data.dependents` array
- [ ] Frontend reads from structured data
- [ ] Test: backend format change doesn't break frontend

## Implementation Notes

- tRPC error shape supports arbitrary `data` field
- Backend: `throw new TRPCError({ code: 'CONFLICT', message: '...', data: { dependents: [...] } })`
