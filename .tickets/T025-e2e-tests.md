# T025: E2E Tests (Playwright)

## Phase: 4 — Polish
## Depends on: T018, T019, T020, T021, T022, T023
## Estimated effort: L

## Description

End-to-end tests covering critical user flows via Playwright. Tests run against a running instance with a test database.

## Acceptance Criteria

- [ ] Playwright configured in `packages/frontend/tests/e2e/`
- [ ] Test: full setup flow:
  - [ ] Create auth token
  - [ ] Login with token
  - [ ] Create provider (mock or real test provider)
  - [ ] Create real model
  - [ ] Create virtual fallback model
  - [ ] Create virtual tuned model
  - [ ] Create endpoint with models
  - [ ] Test model resolution
- [ ] Test: proxy endpoint:
  - [ ] Send OpenAI-compatible request to proxy
  - [ ] Verify SSE stream response (or mock)
- [ ] Test: log dashboard:
  - [ ] View request logs
  - [ ] Filter logs
  - [ ] Stats display
- [ ] Test: CRUD smoke tests for each entity
- [ ] Test setup:
  - [ ] Starts test server with in-memory SQLite
  - [ ] Seeds minimal test data
  - [ ] Cleans up after each test
- [ ] CI: `bun run test:e2e` command

## Implementation Notes

- Use Playwright with Chromium
- Tests need a running server — use `webServer` config in Playwright
- Mock external providers for proxy tests (or use a free-tier API)
