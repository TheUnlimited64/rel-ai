# T050: Duplicated mapNotFound Utility

## Phase: 5 — Quality
## Depends on: T011, T012
## Estimated effort: XS

## Description

Identical `mapNotFound` function defined twice:
- `api/routers/providers.ts:45-54`
- `api/routers/endpoints.ts:14-23`

Same pattern as `mapServiceError` in `models.ts`. DRY violation.

## Acceptance Criteria

- [ ] Extract to shared util (e.g. `api/routers/_helpers.ts`)
- [ ] All routers import from shared location
- [ ] Remove duplicated definitions

## Implementation Notes

- Single utility: `mapNotFound<T>(result: T | null, entity: string): T`
- Might also absorb `mapServiceError` variant
