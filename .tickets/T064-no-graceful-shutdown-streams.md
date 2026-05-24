# T064: No Graceful Shutdown for Active Streams

## Phase: 5 — Quality
## Depends on: T014
## Estimated effort: S

## Description

`server.ts:177` — `server.stop()` drops all connections. Active streaming responses terminate abruptly. Clients get incomplete SSE streams with no error.

## Acceptance Criteria

- [ ] Track active connections/streams
- [ ] On SIGTERM/SIGINT: stop accepting new connections, drain active streams with timeout
- [ ] After timeout (e.g. 10s), force close remaining
- [ ] Test: SIGTERM during active stream → stream completes or errors gracefully

## Implementation Notes

- Bun server `fetch` can track requests via Set or counter
- `process.on('SIGTERM', gracefulShutdown)`
- Response: send `[DONE]` SSE event before closing
