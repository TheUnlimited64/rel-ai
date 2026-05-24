# T079: Dockerfile || true Swallows Install Errors

## Phase: 4 — Polish
## Depends on: T024
## Estimated effort: XS

## Description

`Dockerfile:14-15` — `bun install --frozen-lockfile 2>/dev/null || true` hides dependency installation failures. If workspace deps fail, build proceeds with missing packages.

## Acceptance Criteria

- [ ] Remove `|| true` and `2>/dev/null`
- [ ] Fix root cause of workspace install failures instead
- [ ] Build fails fast on install errors

## Implementation Notes

- `2>/dev/null` was suppressing workspace warnings — fix warnings instead of hiding
