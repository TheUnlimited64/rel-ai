# T081: No .dockerignore — Bloated Build Context

## Phase: 4 — Polish
## Depends on: T024
## Estimated effort: XS

## Description

No `.dockerignore` found. Entire context sent to daemon on build. `node_modules`, `.env`, `test-results`, `playwright-report` included in context.

## Acceptance Criteria

- [ ] Add `.dockerignore` excluding: `node_modules`, `.env`, `*.db*`, `test-results`, `playwright-report`, `.tickets`, `.git`

## Implementation Notes

- Standard Node.js .dockerignore patterns
