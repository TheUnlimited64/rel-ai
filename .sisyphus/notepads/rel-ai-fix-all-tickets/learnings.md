# Learnings

## 2026-05-25 Session Start
- Backend tests: `bun test packages/backend/` (NOT from root)
- Frontend tests: `cd packages/frontend && npx vitest run` (NOT `bun test`)
- 3 tickets already fixed (T033, T035, T087): verification-only commits
- T038 superseded by T088: skip T038
- Feature branch: `fix/all-active-tickets`
- Commit format: `fix(T0XX): Short description` or `chore(T0XX): Verify already-fixed, move ticket to done`

## T036 — sql.raw injection in log purge
- `sql.raw()` in Drizzle bypasses parameterization → SQL injection risk
- Fix: compute date cutoff in JS (`new Date()` + `setDate()`), use Drizzle's `lt()` with ISO string — fully parameterized
- `sql` import from `drizzle-orm` no longer needed in logger.ts after removing `sql.raw`
- Test for sql.raw absence: read source file, assert `src.not.toContain("sql.raw")`

## T070 — Anthropic Adapter apiKey validation
- `overrides?.apiKey as string` at adapter.ts:41 → sends `undefined` as header
- Fix: validate apiKey exists + non-empty string before use, throw `Error("Anthropic API key is required")`
- Pre-existing hint on line 115 (`delta` unused) — not related, not touched
- Test file: `packages/backend/tests/adapters/anthropic/adapter.test.ts` — all 26 tests pass
