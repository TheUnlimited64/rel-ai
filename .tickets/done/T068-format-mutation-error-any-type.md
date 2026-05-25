# T068: formatMutationError Uses any Type

## Phase: 3 — Frontend
## Depends on: T017
## Estimated effort: XS

## Description

`src/lib/format-error.ts:2` — parameter typed `any`. If tRPC error shape changes, silently produces `undefined.message` → runtime crash. `CONFLICT` and `BAD_REQUEST` branches identical (both return `error.message`) — dead code path.

## Acceptance Criteria

- [ ] Type as `TRPCClientError<AppRouter>` from `@trpc/client`
- [ ] Remove redundant CONFLICT branch
- [ ] Test: type errors surface at compile time

## Implementation Notes

- Import from `@trpc/client` — already a dependency
