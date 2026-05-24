# T055: Non-Null Assertion on Optional `before` in Logs Router

## Phase: 5 — Quality
## Depends on: T016
## Estimated effort: XS

## Description

`api/routers/logs.ts:49` uses `input.before!` — non-null assertion on optional string. TypeScript won't catch if `before` is undefined. The `if` check guards it but fragility from refactoring.

```ts
.where(lt(requestLogs.createdAt, input.before!))
```

## Acceptance Criteria

- [ ] Remove `!` assertion — use explicit narrowing
- [ ] Option A: inline condition: `if (input.before) { query.where(lt(..., input.before)) }`
- [ ] Test: `before` undefined → query works (no before filter)

## Implementation Notes

- Single-line fix — move filter inside the existing `if` block
