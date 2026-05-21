# T010: Auth Module

## Phase: 2 — Proxy Core
## Depends on: T002, T003, T009
## Estimated effort: M

## Description

Implement bearer token auth for both the admin API and proxy endpoints. Token generation, hashing, validation.

## Acceptance Criteria

- [ ] Token generation:
  - [ ] `generateToken()` → `{ token: string, hash: string }` — cryptographically secure random token + SHA-256 hash
  - [ ] Token is 32 bytes hex-encoded (64 chars)
- [ ] Auth token CRUD via tRPC:
  - [ ] `auth.createToken({ name })` → returns token (shown once, only hash stored)
  - [ ] `auth.listTokens()` → returns token list (without token value)
  - [ ] `auth.deleteToken({ id })` → removes token
- [ ] Token validation:
  - [ ] `validateToken(token: string)` → `AuthToken | null` — hash + lookup in DB
  - [ ] Updates `lastUsedAt` on successful validation
- [ ] Proxy endpoint validation:
  - [ ] Separate from admin tokens
  - [ ] Each endpoint has its own bearer token
  - [ ] `validateEndpointToken(path: string, token: string)` → `Endpoint | null`
- [ ] API key encryption:
  - [ ] Provider API keys encrypted at rest using `ENCRYPTION_KEY` env var
  - [ ] `encrypt(plaintext)` / `decrypt(ciphertext)` utilities
  - [ ] AES-256-GCM
- [ ] Test: token generation is unique and correctly hashed
- [ ] Test: token validation works for valid/invalid tokens
- [ ] Test: createToken only returns token once
- [ ] Test: API key encrypt/decrypt roundtrip
- [ ] Test: admin token CRUD operations

## Implementation Notes

- Use Web Crypto API (Bun native) for hashing + encryption
- `ENCRYPTION_KEY` must be set on first run — generate one if not present (log warning)
- Keep in `packages/backend/src/core/auth/`
