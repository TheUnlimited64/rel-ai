# T054: No Upstream Abort on Client Disconnect

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: S

## Description

When client disconnects during stream, `cancel()` in `core/proxy/handler.ts:259-349` calls `reader.cancel()` but `fetchWithTimeout`'s `AbortController` is out of scope. Upstream connection to provider remains open until timeout. Resource leak on provider side.

## Acceptance Criteria

- [ ] Store `AbortController` from `fetchWithTimeout` on handler instance
- [ ] In `cancel()` callback, call `abortController.abort()`
- [ ] Upstream provider connection closed promptly on client disconnect
- [ ] Test: client disconnect mid-stream → provider connection aborted within 1s

## Implementation Notes

- Pass AbortController into handler or store as class property
- `fetchWithTimeout` already creates AbortController — extract and expose
