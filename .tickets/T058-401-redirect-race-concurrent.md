# T058: 401 Redirect Race — Multiple Concurrent 401s

## Phase: 3 — Frontend
## Depends on: T023
## Estimated effort: S

## Description

`src/lib/trpc.ts:7-14` — `redirecting` flag prevents redirect loop but is module-scoped mutable state. Two concurrent 401s both resolve before `window.location.replace` completes — second call still fires. Flag never reset — if user navigates back after redirect, any 401 is silently swallowed.

## Acceptance Criteria

- [ ] Use `window.location.href = "/login"` (assignment, not replace) — idempotent
- [ ] Or: use React `<Navigate>` component via `RequireAuth` instead of imperative redirect
- [ ] Reset `redirecting` flag on login success
- [ ] Test: rapid concurrent 401s → single redirect, no loop

## Implementation Notes

- Best fix: let tRPC interceptor reject promise on 401, let `RequireAuth` handle redirect reactively
- Short-term: reset flag on login, use `href` instead of `replace`
