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

## T075 — parseDependents fragile regex
- Fragile regex: `msg.match(/HAS_DEPENDENTS:(.+)/)` coupled backend string format to frontend parsing
- Fix: backend sends JSON-array in error message (`HAS_DEPENDENTS:["a","b"]`), router parses via `JSON.parse`, attaches to custom TRPCError property, error formatter merges into response `data.dependents`
- tRPC v11 TRPCError constructor does NOT accept `data` field — only `{ message, code, cause }`
- Workaround: set dependents as custom property on error instance, add `errorFormatter` in `initTRPC.create()` to merge into response shape
- Frontend reads `error.data.dependents` via structured property access instead of regex
- `createCaller()` doesn't go through error formatter → backend tests can't verify `data.dependents` via caller
- Test added: frontend `parseDependents` unit test (12 cases) in `packages/frontend/tests/unit/`
- Files changed: `service.ts`, `routers/models.ts`, `trpc.ts`, `useModels.ts`, `detail.tsx` (unchanged), new test file

## T061 — extractBearerToken
- Two auth parsing locations: `routes/proxy.ts` (strict `parts.length !== 2`) and `api/context.ts` (destructured `split(" ")`, silently accepted double-space)
- Created `extractBearerToken()` in `core/auth/token.ts` using regex `^Bearer (\S+)$` — single-space only, rejects double-space patterns
- Exported from `core/auth/index.ts` alongside existing auth functions
- `\s+` in regex matches multiple spaces → use plain space ` ` for strict single-space matching
- 2 pre-existing test failures (ProxyHandler client disconnect) unrelated to this change

## T064 — Graceful shutdown for in-flight streams
- Bun.serve() `server.stop()` drops all connections immediately — no drain
- Fix: wrap `app.fetch` to track `activeConnections` counter (inc on request, dec on response settle)
- `shuttingDown` flag returns 503 for new requests during shutdown
- SIGTERM/SIGINT handlers → set flag, await drain loop (100ms poll, 10s timeout), then server.stop()
- Exposed `triggerShutdown()`, `activeConnections`, `shuttingDown` on StartedServer for testability
- Test: use random ports (30xxx range) to avoid EADDRINUSE; use `triggerShutdown()` instead of `process.kill()` to avoid killing test runner
- Async fetch handling: check `result instanceof Promise` — sync responses decrement immediately, async use `.finally()`
- 2 pre-existing handler test failures (abort signal propagation) — NOT caused by this change
