# T028: API Key Encryption Integration

## Phase: 2 — Proxy Core
## Depends on: T003, T010
## Estimated effort: S

## Description

Wire the encrypt/decrypt utilities from T010 into the DB layer so provider API keys are never stored in plaintext.

## Acceptance Criteria

- [ ] Drizzle middleware or hooks encrypt `api_key` before insert/update
- [ ] Drizzle middleware or hooks decrypt `api_key` on read when needed (sending to provider)
- [ ] List/get endpoints return masked API keys — decryption only happens in proxy path
- [ ] Migration: existing unencrypted keys encrypted on startup (if any)
- [ ] Test: API key is encrypted in DB file
- [ ] Test: decrypted key matches original
- [ ] Test: masked output from API

## Implementation Notes

- Don't use Drizzle middleware (unstable). Use explicit encrypt/decrypt in service layer
- The proxy handler is the only consumer of decrypted API keys
