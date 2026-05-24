# T073: toggleMutation Stale Cache Shape Mismatch

## Phase: 3 — Frontend
## Depends on: T019
## Estimated effort: XS

## Description

`endpoints/hooks/useEndpoints.ts:9-19` — `onSuccess` manually computes `modelCount: updated.models.length` to adapt `EndpointGetResponse` into `EndpointListResponse`. If `models` undefined, `.length` throws. Fragile coupling between two API response types.

## Acceptance Criteria

- [ ] Use `modelCount: updated.models?.length ?? 0` + guard
- [ ] Better: invalidate `endpoints.list` after toggle (like delete does)
- [ ] Test: toggle endpoint → list cache updates correctly

## Implementation Notes

- Cache invalidation is simpler and more reliable than manual shape mapping
