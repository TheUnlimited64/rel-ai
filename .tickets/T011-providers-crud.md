# T011: Providers CRUD API

## Phase: 2 — Proxy Core
## Depends on: T003, T009, T010
## Estimated effort: S

## Description

Implement the providers tRPC router with full CRUD operations. Provider data persists to SQLite.

## Acceptance Criteria

- [ ] `providers.create({ name, adapterType, baseUrl, apiKey, config? })`:
  - [ ] Validates input with Zod
  - [ ] Encrypts API key before storage
  - [ ] Returns created provider (API key masked)
- [ ] `providers.list()` → all providers (API keys masked)
- [ ] `providers.get({ id })` → single provider (API key masked)
- [ ] `providers.update({ id, ...fields })`:
  - [ ] Partial updates supported
  - [ ] If apiKey provided, re-encrypts
  - [ ] Returns updated provider
- [ ] `providers.delete({ id })`:
  - [ ] Cascade deletes related models
  - [ ] Returns success
- [ ] `providers.testConnection({ id })`:
  - [ ] Makes a minimal request to provider (e.g., list models)
  - [ ] Returns `{ success: boolean, error?: string, latencyMs: number }`
- [ ] API key masking: stored encrypted, API returns `sk-...****` format
- [ ] Test: full CRUD lifecycle
- [ ] Test: create with invalid input fails validation
- [ ] Test: API key encryption on create/update
- [ ] Test: test connection with mock provider
- [ ] Test: delete cascades to models

## Implementation Notes

- Use Drizzle for DB operations
- Keep router thin — delegate to `packages/backend/src/core/provider/` service functions
- Test connection uses the adapter's HTTP format but hits `/models` endpoint
