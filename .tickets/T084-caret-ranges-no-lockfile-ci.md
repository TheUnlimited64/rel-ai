# T084: Caret Ranges Without Lockfile Validation in CI

## Phase: 4 — Polish
## Depends on: T001
## Estimated effort: XS

## Description

`package.json` dev dependencies use caret ranges (`^8.0.0`). `bun.lock` exists but `--frozen-lockfile` not enforced in CI. Supply chain risk.

## Acceptance Criteria

- [ ] Add `bun install --frozen-lockfile` check in CI pipeline
- [ ] Document CI requirement in README
- [ ] Consider stricter pinning for security-critical deps

## Implementation Notes

- GitHub Actions: `bun install --frozen-lockfile` step before build/test
