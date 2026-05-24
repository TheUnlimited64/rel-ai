# T067: E2E Auth State Stored in Plain JSON

## Phase: 4 — Testing
## Depends on: T025
## Estimated effort: XS

## Description

`playwright.config.ts:6` — `tests/e2e/.auth/user.json` stores auth state. If committed to git, leaks credentials.

## Acceptance Criteria

- [ ] Add `.auth/` to `.gitignore`
- [ ] Use env vars for test tokens in CI
- [ ] Verify `.auth/user.json` is gitignored

## Implementation Notes

- Add `tests/e2e/.auth/` to `.gitignore`
- CI: generate fresh auth state before E2E runs
