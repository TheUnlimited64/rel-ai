# T015: Request Logging Module

## Phase: 2 — Proxy Core
## Depends on: T002, T003
## Estimated effort: S

## Description

Implement request logging for all proxied requests. Store in SQLite for dashboard consumption. Emit log events from proxy handler.

## Acceptance Criteria

- [ ] `RequestLogger` class with method `log(entry: RequestLogEntry)`:
  - [ ] Accepts: endpointId, requestedModel, resolvedModel, providerId, promptTokens, completionTokens, latencyMs, status, errorDetail
  - [ ] Persists to `request_logs` table
- [ ] `RequestLogQuery` class with methods:
  - [ ] `list({ endpointId?, providerId?, status?, from?, to?, limit?, offset? })` → paginated results
  - [ ] `stats({ from?, to? })` → `{ totalRequests, successRate, avgLatencyMs, totalTokens, byProvider: [...], byModel: [...] }`
- [ ] Log retention: configurable, default 30 days. `purgeOldLogs()` removes expired entries.
- [ ] Test: log entry persists and is queryable
- [ ] Test: list with filters
- [ ] Test: stats aggregation correct
- [ ] Test: purge removes old entries

## Implementation Notes

- Event-driven: proxy handler emits events, logger subscribes
- Use Drizzle for queries
- Keep in `packages/backend/src/core/logging/`
