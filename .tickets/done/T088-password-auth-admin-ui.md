# T088: Replace Token Auth with Password Auth for Admin UI

## Phase: 6 — Auth Overhaul
## Depends on: T010, T023
## Estimated effort: L

## Description

Replace current bearer-token-in-localStorage auth with password-based session auth. Admin password set via `ADMIN_PASSWORD` env var (`.env` file). Backend issues httpOnly session cookie on login. Frontend checks session on mount via `/me` endpoint. 401 responses no longer force logout — show error toast instead.

Current flow (broken):
1. User enters bearer token manually
2. Token stored in `localStorage` (XSS-vulnerable, see T038)
3. Every tRPC request attaches `Authorization: Bearer` header
4. 401 response → `localStorage.removeItem()` + redirect to `/login`

Proposed flow:
1. User enters password on login page
2. Backend validates against `ADMIN_PASSWORD` env var
3. On success: server sets httpOnly session cookie, returns user info
4. Frontend calls `/me` on mount — if session valid → show app, else → login page
5. 401 responses show error notification, do NOT redirect to login

## Acceptance Criteria

### Backend
- [ ] Add `ADMIN_PASSWORD` env var support (required on startup, fail loudly if missing in production)
- [ ] Create `/api/auth/login` route — accepts `{ password }`, validates against env var, sets httpOnly session cookie
- [ ] Create `/api/auth/logout` route — clears session cookie
- [ ] Create `/api/auth/me` route — returns `{ authenticated: true }` if valid session, 401 otherwise
- [ ] Update tRPC context: authorize via session cookie instead of `Authorization` header
- [ ] Session cookie: `httpOnly: true, secure: true in production, sameSite: "Lax", path: "/"`
- [ ] Keep existing `auth.verifyToken` / auth token CRUD for proxy endpoint tokens (those are separate from admin auth)

### Frontend
- [ ] Login page: replace "Bearer token" input with "Password" input
- [ ] Login calls `/api/auth/login` (not tRPC `verifyToken`)
- [ ] On success: no localStorage — session cookie handles auth automatically
- [ ] Remove `TOKEN_KEY` / `localStorage` usage from `auth.tsx` and `trpc.ts`
- [ ] AuthProvider: on mount, call `/api/auth/me` to check session
  - [ ] If authenticated → set `isAuthenticated: true`, render app
  - [ ] If 401 → set `isAuthenticated: false`, render login
  - [ ] While checking → show loading state
- [ ] tRPC `customFetch`: remove 401 → redirect-to-login logic
  - [ ] Instead: 401 responses should trigger error toast/notification in UI
  - [ ] Do NOT auto-logout on 401 (session might be valid but endpoint-specific error)
- [ ] `RequireAuth` component: no longer triggers redirect race — check `isAuthenticated` from AuthProvider (which already checked `/me`)
- [ ] Remove `Authorization: Bearer` header injection from tRPC httpLink

### Error Handling
- [ ] 401 on any tRPC call → show error toast, do NOT redirect to `/login`
- [ ] Only redirect to `/login` when `/me` returns 401 (confirmed session expired)
- [ ] Network errors → show "Unable to connect" toast, do NOT redirect

### E2E Tests
- [ ] Update auth.setup.ts: login with password instead of token
- [ ] Update auth.spec.ts: valid password redirects, invalid shows error
- [ ] Remove `rel_ai_token` localStorage references from all test files

## Implementation Notes

- Session mechanism: simple signed cookie (e.g., `hono/cookie` + HMAC). No need for full session store — stateless is fine for single-admin homelab.
- `ADMIN_PASSWORD` should be optional in dev mode (default: `admin` with warning), required in production.
- This effectively resolves T038 (localStorage XSS) as a side effect — no more token in localStorage.
- Keep proxy endpoint bearer tokens untouched. Those authenticate external API consumers, not admin UI.
- Files to modify:
  - `packages/backend/src/core/auth/` — add password validation, session cookie creation
  - `packages/backend/src/api/middleware/auth.ts` — check session cookie instead of Bearer header
  - `packages/backend/src/api/context.ts` — update context creation
  - `packages/frontend/src/lib/auth.tsx` — session-based auth, /me check on mount
  - `packages/frontend/src/lib/trpc.ts` — remove Bearer header, remove 401-redirect
  - `packages/frontend/src/features/auth/login.tsx` — password input
  - `.env.example` — add `ADMIN_PASSWORD`
