# T071: Stream Reader Not Cancelled on Error

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: XS

## Description

`core/proxy/handler.ts:343` — when stream processing errors, `controller.error(err)` called but `reader` from upstream provider response never cancelled. Connection to provider stays open until timeout. Resource leak.

## Acceptance Criteria

- [ ] Add `reader.cancel()` in catch block before `controller.error()`
- [ ] Upstream connection closed on error
- [ ] Test: stream error → upstream reader cancelled

## Implementation Notes

- Wrap in `try { reader.cancel() } catch {}` — cancel may throw if already closed
