# T012: Endpoints CRUD API

## Phase: 2 — Proxy Core
## Depends on: T003, T009, T010
## Estimated effort: S

## Description

Implement the endpoints tRPC router. Endpoints define proxy routes with their own bearer tokens and available model sets.

## Acceptance Criteria

- [ ] `endpoints.create({ name, path, modelIds })`:
  - [ ] Validates path format (`/^[a-z0-9-]+$/`)
  - [ ] Generates endpoint bearer token automatically
  - [ ] Creates endpoint + endpoint_models junction entries
  - [ ] Returns endpoint with token (shown once)
- [ ] `endpoints.list()` → all endpoints (without tokens)
- [ ] `endpoints.get({ id })` → single endpoint (without token)
- [ ] `endpoints.update({ id, ...fields })`:
  - [ ] Can update name, path, enabled
  - [ ] Can update model list (replaces junction entries)
  - [ ] Returns updated endpoint
- [ ] `endpoints.delete({ id })`:
  - [ ] Deletes endpoint + junction entries
  - [ ] Returns success
- [ ] `endpoints.regenerateToken({ id })`:
  - [ ] Generates new token, replaces old hash
  - [ ] Returns new token (shown once)
- [ ] `endpoints.getModels({ id })` → list of models available on this endpoint
- [ ] Path uniqueness enforced (DB constraint)
- [ ] Test: full CRUD lifecycle
- [ ] Test: create with duplicate path fails
- [ ] Test: regenerate token invalidates old token
- [ ] Test: model list updates work
- [ ] Test: delete removes junction entries

## Implementation Notes

- Token generation reuses auth module's `generateToken()`
- Endpoint paths become proxy routes: `POST /v1/{path}/chat/completions`
