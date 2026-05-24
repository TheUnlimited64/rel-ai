# T038: Auth Token Stored in localStorage — XSS Vulnerability

## Phase: 5 — Security Hardening
## Depends on: T023
## Estimated effort: M

## Description

Frontend stores JWT/bearer token in `localStorage` under key `rel_ai_token` (`src/lib/trpc.ts:5,24`, `src/lib/auth.tsx:11,23-24,27-28`). Any XSS — from a dependency, CDN compromise, or template injection — gives attacker full read of auth token. `localStorage` inaccessible to httpOnly cookies.

Token read on every tRPC request and on app bootstrap.

## Acceptance Criteria

- [ ] Backend sets auth token as httpOnly cookie on login
- [ ] Remove all `localStorage.getItem/setItem(TOKEN_KEY)` from frontend
- [ ] tRPC client uses cookie-based auth (credentials: "include" or "same-origin")
- [ ] Backend clears cookie on logout
- [ ] Short-term: add CSP headers (connect-src, script-src) as defense-in-depth
- [ ] Test: login sets httpOnly cookie
- [ ] Test: tRPC requests send cookie automatically
- [ ] Test: XSS payload cannot read token from JS

## Implementation Notes

- Hono `setCookie` with `httpOnly: true, secure: true, sameSite: "Lax"`
- `customFetch` in trpc.ts no longer needs to manually attach `Authorization` header
- Cookie path: `/` to cover both `/api/trpc` and `/v1/*`
- Consider CSRF protection if using cookie auth (SameSite helps)
