# T021: Request Logs Dashboard UI

## Phase: 4 — Polish
## Depends on: T016, T017
## Estimated effort: M

## Description

Request log dashboard: searchable log table + usage stats cards/charts.

## Acceptance Criteria

- [ ] Log table:
  - [ ] Columns: timestamp, endpoint, requested model, resolved model, provider, tokens, latency, status
  - [ ] Filters: date range, endpoint, provider, status
  - [ ] Pagination
  - [ ] Click row → expand for error details
  - [ ] Status badges: success (green), error (red), rate_limited (amber)
- [ ] Stats cards:
  - [ ] Total requests (time period)
  - [ ] Success rate %
  - [ ] Average latency
  - [ ] Total tokens used
- [ ] Stats by provider (bar chart or table)
- [ ] Stats by model (bar chart or table)
- [ ] Date range selector (presets: 1h, 24h, 7d, 30d)
- [ ] Auto-refresh option (poll every 10s)
- [ ] All components under 100 lines
- [ ] Test: log table renders
- [ ] Test: filters work
- [ ] Test: stats display

## Implementation Notes

- Charts: use `recharts` (lightweight, React-native)
- Or use simple tables instead of charts for MVP
- Pagination via cursor (tRPC supports this)
