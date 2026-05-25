# T095: Expand Frontend Test Coverage — Models, Logs, Wizard

## Phase: 5 — Quality
## Depends on: T018, T019, T020, T021, T027
## Estimated effort: L

## Description

3 frontend feature areas have severely insufficient test coverage. Models has 13 source files but only 3 test files. Logs has only shallow rendering checks. Wizard — the critical onboarding flow — has no meaningful interaction tests. These are the features users interact with most; bugs here are immediately visible.

### Coverage Gaps

| # | Feature | Source Files | Test Files | Gap |
|---|---------|-------------|------------|-----|
| 1 | `features/models/` | 13 (resolver, list, detail, edit, assign, toggle) | 3 (shallow renders) | Missing: model resolution display, endpoint assignment, provider toggle, error states |
| 2 | `features/logs/` | 5+ (dashboard, filters, detail, stats) | ~2 (render only) | Missing: filter interactions, date range, stats rendering, error/empty states |
| 3 | `features/wizard/` | Multi-step setup flow | Minimal | Missing: step navigation, validation, API key test, provider creation, retry on failure |

## Acceptance Criteria

### models/ — New Tests
- [ ] `ModelResolver` display: shows matched provider + endpoint, resolution priority
- [ ] `ModelList` filtering: by provider, by status (healthy/unhealthy/disabled)
- [ ] `ModelDetail` page: shows model config, assigned endpoints, provider info
- [ ] `ModelEdit` form: validation (required fields), save success, save error handling
- [ ] `EndpointAssignment`: assign/unassign endpoint to model, reorder priority
- [ ] `ProviderToggle`: toggle provider enabled/disabled, confirmation dialog, optimistic update
- [ ] Error states: model not found, provider down, no endpoints assigned
- [ ] Loading states: skeleton/spinner while data loads

### logs/ — New Tests
- [ ] `LogDashboard` initial load: date range defaults (last 24h), pagination
- [ ] `LogFilter` interactions: provider filter, model filter, status filter (success/error/timeout)
- [ ] `LogDetail` expansion: click row → expanded detail with request/response payload
- [ ] `LogStats` rendering: total requests, error rate, token usage charts
- [ ] Empty state: no logs → "No requests yet" message
- [ ] Error state: tRPC fetch failure → error boundary / retry button
- [ ] Date range picker: custom range, preset ranges (1h, 24h, 7d, 30d)

### wizard/ — New Tests
- [ ] Step navigation: next/prev, cannot skip required steps, cannot proceed with invalid input
- [ ] Step 1 (Welcome): description rendered, "Get Started" button enabled
- [ ] Step 2 (Provider creation): API key validation, test connection button, success/failure feedback
- [ ] Step 3 (Endpoint creation): path validation, provider selection, model selection
- [ ] Step 4 (Completion): summary shown, "Go to Dashboard" navigates correctly
- [ ] Wizard completion: full walk-through creates provider + endpoint + model
- [ ] Retry on failure: test connection fails → retry works, doesn't duplicate provider
- [ ] Browser refresh mid-wizard: state preserved (localStorage/session) or graceful restart

## Implementation Notes

- Use **MSW** (Mock Service Worker) for tRPC API mocking — matches production behavior better than `vi.mock()`.
- Use `@testing-library/react` + `@testing-library/user-event` for interaction tests.
- Avoid testing implementation details (component state, CSS classes). Test user-visible behavior.
- Wizard tests: consider a custom `renderWizard()` helper that wraps with providers and MSW.
- Test files should live alongside source: `features/models/__tests__/ModelEdit.test.tsx`.
- Prefer integration-style tests over unit tests for UI components.
