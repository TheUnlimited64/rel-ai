# T016: Logs Query API

## Phase: 2 — Proxy Core
## Depends on: T009, T015
## Estimated effort: S

## Description

tRPC router for querying request logs and statistics.

## Acceptance Criteria

- [ ] `logs.list({ endpointId?, providerId?, status?, from?, to?, limit?, offset? })` → paginated results
- [ ] `logs.stats({ from?, to? })` → aggregated stats
- [ ] `logs.clear({ before? })` → delete logs older than date
- [ ] Default `limit: 50`, max `limit: 500`
- [ ] Test: list returns logs
- [ ] Test: list with filters
- [ ] Test: stats aggregation
- [ ] Test: clear removes old logs

## Implementation Notes

- Thin router delegating to `RequestLogQuery`
