# T045: useParams() Non-Null Assertion on Undefined ID

## Phase: 5 — Security Hardening
## Depends on: T017, T019
## Estimated effort: XS

## Description

Three detail pages use `useParams()` which returns `{ id?: string }`. All pass `id!` (non-null assertion) to tRPC queries:
- `endpoints/detail.tsx:21`
- `providers/detail.tsx:23`
- `models/detail.tsx:23`

If route matched without `:id` param, `id` is `undefined` — `!` suppresses TypeScript protection. The `enabled: !!id` guard prevents query firing, but downstream code dereferences potentially undefined data.

## Acceptance Criteria

- [ ] Replace `id!` with explicit guard: `if (!id) return <Navigate to="/endpoints" />`
- [ ] Apply fix to all three detail pages
- [ ] Remove non-null assertion operator
- [ ] TypeScript strict mode catches missing guard

## Implementation Notes

- Import `Navigate` from react-router
- Guard before any query/mutation hooks that depend on `id`
- Pattern: `if (!id) return <Navigate to={parentRoute} replace />`
