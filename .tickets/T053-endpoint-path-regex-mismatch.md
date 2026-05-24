# T053: Shared EndpointSchema Path Regex Mismatch

## Phase: 5 — Quality
## Depends on: T002, T012
## Estimated effort: XS

## Description

Shared schema: `shared/src/schemas/endpoint.ts:6` — `z.string().regex(/^\/[a-z0-9-]+$/)` requires leading `/`.
Router: `api/routers/endpoints.ts:25` — `z.string().regex(/^[a-z0-9-]+$/)` no leading `/`.
DB stores without `/`, proxy route `/:endpointPath/*` expects no `/`. Shared schema is wrong — will reject valid endpoints.

## Acceptance Criteria

- [ ] Remove leading `/` from shared `EndpointSchema` regex
- [ ] Shared schema: `/^[a-z0-9-]+$/`
- [ ] Test: endpoint creation with path `my-endpoint` passes both validations

## Implementation Notes

- Single character fix in shared package
- Verify no other code depends on leading `/` in endpoint paths
