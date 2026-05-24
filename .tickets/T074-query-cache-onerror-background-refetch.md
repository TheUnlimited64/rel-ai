# T074: Query Cache onError Fires for Background Refetches

## Phase: 3 — Frontend
## Depends on: T017
## Estimated effort: XS

## Description

`src/lib/query-client.ts:24-28` — global `onError` fires for every query failure including background refetches (staleTime 30s). Backend temporarily unreachable → user gets toast spam on every background refetch. No dedup or throttle.

## Acceptance Criteria

- [ ] Check `query.state.fetchStatus !== 'fetching'` to suppress background errors
- [ ] Or: use `meta` to mark queries that should show toasts
- [ ] Add toast dedup by message
- [ ] Test: background refetch failure → no user-visible toast

## Implementation Notes

- React Query distinguishes `fetchStatus: 'fetching'` (user-initiated) vs `'paused'` (background)
- Only show toasts for user-initiated fetches
