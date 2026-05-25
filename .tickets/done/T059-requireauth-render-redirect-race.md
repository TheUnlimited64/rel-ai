# T059: RequireAuth and RedirectIfAuth — Race Between Render and Effect

## Phase: 3 — Frontend
## Depends on: T023
## Estimated effort: S

## Description

`src/lib/auth.tsx:54-68,70-84` — Both components render children (or fallback) on first paint, then navigate in `useEffect`. Authenticated content briefly visible on unauthenticated route. `useEffect` navigation is async — child components mount, fire queries with bad/no token.

## Acceptance Criteria

- [ ] Replace `useEffect` + `useNavigate` with `<Navigate>` component
- [ ] `if (!isAuthenticated) return <Navigate to="/login" replace />`
- [ ] Immediate redirect on render — no flash of protected content
- [ ] Test: unauthenticated route → no protected content in DOM before redirect

## Implementation Notes

- `<Navigate>` is declarative — renders redirect immediately, no effect timing issues
- Import from `react-router-dom`
