# T049: N+1 Queries in listEndpoints and getEndpoint

## Phase: 5 — Quality
## Depends on: T012
## Estimated effort: S

## Description

`core/endpoint/service.ts:106-111` — `listEndpoints` runs `count(*)` per endpoint in a loop. `service.ts:142-146` — `getEndpoint` runs `select` per junction row. O(n) queries where 1 suffices.

## Acceptance Criteria

- [ ] `listEndpoints`: use JOIN + GROUP BY for single-query model counts
- [ ] `getEndpoint`: use JOIN for single-query model fetch
- [ ] Test: listEndpoints makes 1 query (not N+1)
- [ ] Test: getEndpoint makes 1 query (not N+1)

## Implementation Notes

- Drizzle supports joins: `db.select().from(endpoints).leftJoin(endpointModels, ...)`
- Group by endpoint ID, count models in single pass
