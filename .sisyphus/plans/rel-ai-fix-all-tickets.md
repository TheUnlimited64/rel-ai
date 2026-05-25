# rel-ai Fix All Active Tickets

## TL;DR

> **Quick Summary**: Fix all 52 active tickets (T033-T088, minus T033/T035/T087 already done, T038 superseded by T088) sequentially with one git commit per ticket. Each fix includes validity verification, test, and commit.
> 
> **Deliverables**:
> - 52 git commits, one per ticket
> - Meaningful test per ticket fix
> - All active tickets resolved
> - Clean test suite (worthless schema tests deleted as encountered)
> 
> **Estimated Effort**: XL (52 tickets)
> **Parallel Execution**: YES - 9 waves
> **Critical Path**: T036 → T037 → T044 → T064 → T086 (security → proxy → server chain)

---

## Context

### Original Request
Fix all active tickets in rel-ai codebase with sequential git commits, one ticket per commit. Verify validity before fixing. Include tests per ticket.

### Interview Summary
**Key Discussions**:
- Scope: ALL active tickets (user chose all 56, Metis found 3 already done + 1 superseded = 52 remaining)
- One ticket = one commit (strict, no grouping)
- Pre-existing issues: verify ticket still valid before fixing
- Test per ticket: yes, meaningful tests, delete worthless schema tests as encountered
- T033, T035, T087 already fixed in code but ticket still active → verification commits to move to done/
- T038 superseded by T088 — skip T038, T088 absorbs its scope

**Research Findings**:
- Backend tests: `bun:test` (bun test runner), in-memory SQLite via `createMemoryDb()`
- Frontend unit tests: `vitest` + `jsdom` (must use `npx vitest run`, NOT `bun test`)
- Frontend E2E: `@playwright/test`
- Frontend `bun test` broken by design — doesn't support jsdom environment
- Root `bun test` also fails for frontend — must run per-package

### Metis Review
**Identified Gaps** (addressed):
- 3 tickets already fixed (T033, T035, T087): Handled as verification-only commits
- T038 superseded by T088: T038 skipped, T088 absorbs scope
- T039+T040 coupled on proxy.ts schema: T040 first (narrower), then T039 (passthrough)
- Frontend test runner mismatch: Specified correct commands per package in plan
- T048 has two paths (document vs migrate): Choose document-only per ticket text "acceptable for homelab scale"
- Already-fixed tickets: Verification commit to move to done/, not a code fix

---

## Work Objectives

### Core Objective
Resolve all 52 active tickets in the rel-ai codebase with sequential git commits, one ticket per commit, verifying validity before fixing and including meaningful tests per fix.

### Concrete Deliverables
- 52 git commits on a feature branch
- Each commit: verify → fix → test → commit
- 3 verification-only commits for already-fixed tickets (T033, T035, T087)
- Worthless schema tests deleted as part of related ticket fixes
- All tests passing after each commit

### Definition of Done
- [ ] All 52 ticket files moved to `.tickets/done/`
- [ ] `bun test packages/backend/` passes
- [ ] `npx vitest run` in `packages/frontend/` passes
- [ ] No regressions introduced
- [ ] Each ticket has exactly one commit referencing it

### Must Have
- One commit per ticket (no grouped commits)
- Test per ticket fix
- Validity verification step before each fix
- Feature branch with clean commit history
- Backend: `bun test` passing after each commit
- Frontend: `npx vitest run` passing after each commit

### Must NOT Have (Guardrails)
- NO grouped commits spanning multiple tickets
- NO skipping validity verification
- NO `as any` or `@ts-ignore` introduced as "fixes"
- NO removal of test files that test real application logic
- NO changes beyond the ticket's scope (scope creep per ticket)
- NO `sql.raw()` used anywhere new
- NO console.log added to production code
- NO breaking the existing API contract without updating version
- NO committing without running test suite first

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES
- **Automated tests**: Tests-after (write test for each fix after implementing)
- **Framework**: Backend: `bun:test`, Frontend unit: `vitest` + `jsdom`, Frontend E2E: `playwright`
- **Backend test command**: `bun test packages/backend/tests/`
- **Frontend test command**: `cd packages/frontend && npx vitest run`
- **CRITICAL**: Do NOT use `bun test` from root or in frontend package — it fails on jsdom

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Backend**: Use Bash (`bun test`) — run relevant test file, assert pass count
- **Frontend**: Use Bash (`npx vitest run`) — run relevant test file, assert pass count
- **Streaming**: Use interactive_bash (tmux) — start server, send curl request, verify SSE output

---

## Execution Strategy

### Parallel Execution Waves

> Tickets are ordered by: (1) security/critical first, (2) file coupling — same-file tickets sequential, (3) dependency chain, (4) independent tickets parallelizable within wave.
> 
> Within a wave, tasks can run in parallel ONLY if they touch different files.
> Same-file conflicts resolved by ordering within wave (listed top-to-bottom = execution order).

```
Wave 1 (Verification-only — 3 already-fixed tickets):
└── T033: Verify tRPC error transform fix, move to done/ [quick]
└── T035: Verify root bun test fixes, move to done/ [quick]
└── T087: Verify hot-reload dev workflow, move to done/ [quick]

Wave 2 (Security critical — SQL injection + error leaking + auth):
├── T036: SQL injection in logger.ts [quick]
├── T070: Anthropic adapter missing apiKey [quick]
├── T042: Admin token logged to stdout [quick]
├── T041: Encryption key file permissions [quick]
└── T052: Provider encrypted key type confusion [unspecified-low]

Wave 3 (Proxy + handler fixes — same-file sequential):
├── T037: Provider errors leak to clients (handler.ts) [unspecified-high]
├── T040: Unsafe role cast enum (proxy.ts) [quick]
├── T039: Proxy schema strips OpenAI params (proxy.ts) [unspecified-high]
├── T047: Request ID mismatch proxy-handler (proxy.ts + handler.ts) [quick]
├── T056: handleNonStream text matching too broad (handler.ts) [quick]
└── T075: parse-dependents regex fragile (shared schema + handler) [quick]

Wave 4 (Server infrastructure + CORS + shutdown):
├── T044: No CORS configuration (server.ts) [quick]
├── T064: No graceful shutdown for streams (server.ts) [unspecified-high]
├── T054: No upstream abort on disconnect (handler.ts) [unspecified-high]
├── T071: Stream reader not cancelled on error (handler.ts) [quick]
└── T061: Inconsistent auth header parsing (proxy.ts) [quick]

Wave 5 (Type safety + code quality — backend services):
├── T048: Sync DB blocks event loop — document tradeoff [quick]
├── T049: N+1 endpoint queries [quick]
├── T050: Duplicated mapNotFound utility [quick]
├── T051: Module-level side effects in index.ts [quick]
├── T053: Endpoint path regex mismatch [quick]
├── T057: checkFirstRun queries every call [quick]
├── T062: TextEncoder allocation per chunk [quick]
├── T063: mergeUsage token arithmetic [quick]
├── T065: Regenerate apiKey hardcoded prefix [quick]
├── T066: Date.now vs performance.now [quick]
└── T072: mapServiceError sync catch only [quick]

Wave 6 (Frontend fixes — type safety + auth race conditions):
├── T045: useParams non-null assertion [quick]
├── T046: Unsafe provider response casts [quick]
├── T055: Non-null assertion in logs (backend) [quick]
├── T059: RequireAuth render redirect race [quick]
├── T058: 401 redirect race concurrent [quick]
├── T060: Provider apiKey exposed in frontend type [quick]
├── T067: E2E auth state plain JSON [quick]
├── T068: Format mutation error any type [quick]
├── T069: customFetch swallows non-401 [quick]
└── T073: Toggle mutation stale cache [quick]

Wave 7 (More code quality + frontend):
├── T074: Query cache onError background refetch [quick]
├── T085: Toggle endpoint no concurrent guard [quick]
├── T038: SKIPPED — superseded by T088
└── T043: Unpinned Docker base image [quick]

Wave 8 (Docker hardening — sequential, same Dockerfile):
├── T079: Dockerfile swallows install errors [quick]
├── T080: NODE_ENV not set in Docker [quick]
├── T081: No .dockerignore [quick]
├── T082: No Docker logging configuration [quick]
├── T083: Frontend package.json misconfiguration [quick]
├── T076: No Docker healthcheck [quick]
├── T077: Port bound all interfaces [quick]
└── T078: Encryption key in plain env var [quick]

Wave 9 (Feature requests — largest individual tickets):
├── T086: CommandCode adapter [deep]
└── T088: Password auth admin UI (absorbs T038) [deep]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── F1: Plan compliance audit (oracle)
├── F2: Code quality review (unspecified-high)
├── F3: Real manual QA (unspecified-high)
└── F4: Scope fidelity check (deep)
```

### Dependency Matrix

> Abbreviated. Show dependencies between active tickets only.
> Most tickets depend only on done tickets (T001-T034) — they're independent of each other.
> Coupling = same-file ordering constraint, not hard dependency.

| Ticket | Depends On (active) | Coupled With (same file) | Blocks |
|--------|---------------------|--------------------------|--------|
| T033 | — | — | — (verification only) |
| T035 | — | — | — (verification only) |
| T087 | — | — | — (verification only) |
| T036 | — | — | — |
| T037 | — | handler.ts: T047, T054, T056, T071 | T044, T064 |
| T039 | T040 | proxy.ts: T040, T047, T056, T061 | — |
| T040 | — | proxy.ts: T039, T047, T056, T061 | T039 |
| T047 | — | proxy.ts: T039, T040; handler.ts: T037 | — |
| T054 | — | handler.ts: T037, T071 | — |
| T071 | — | handler.ts: T037, T054 | — |
| T056 | — | handler.ts: T037; proxy.ts: T039 | — |
| T061 | — | proxy.ts: T039, T040 | — |
| T064 | — | server.ts: T044 | — |
| T044 | — | server.ts: T064 | — |
| T048 | — | service.ts: T049, T050, T065 | T049, T050 |
| T049 | — | endpoint/service.ts: T048 | — |
| T050 | — | provider/service.ts: T048, T065 | — |
| T038 | SKIPPED (superseded by T088) | — | — |
| T058 | T069 | auth.tsx: T059, T068, T069 | T088 |
| T059 | — | auth.tsx: T058, T068, T069 | T088 |
| T068 | — | trpc.ts: T069 | T088 |
| T069 | — | trpc.ts: T068, auth.tsx: T058, T059 | T058 |
| T088 | T058, T059 | auth.tsx, trpc.ts | — |
| T043 | — | Dockerfile: T079-T083 | — |
| T079 | — | Dockerfile: T043, T080-T083 | T080 |
| T086 | — | server.ts, new adapter file | — |
| All others | — | — | — |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — all `quick`
- **Wave 2**: 5 tasks — T036 `quick`, T041 `quick`, T042 `quick`, T052 `unspecified-low`, T070 `quick`
- **Wave 3**: 6 tasks — T037 `unspecified-high`, T039 `unspecified-high`, T040 `quick`, T047 `quick`, T056 `quick`, T075 `quick`
- **Wave 4**: 5 tasks — T044 `quick`, T054 `unspecified-high`, T061 `quick`, T064 `unspecified-high`, T071 `quick`
- **Wave 5**: 11 tasks — all `quick`
- **Wave 6**: 9 tasks — all `quick`
- **Wave 7**: 4 tasks — all `quick`
- **Wave 8**: 8 tasks — all `quick`
- **Wave 9**: 2 tasks — T086 `deep`, T088 `deep`
- **FINAL**: 4 tasks — F1 `oracle`, F2 `unspecified-high`, F3 `unspecified-high`, F4 `deep`

**Total**: 52 tickets + 4 final verification = 56 tasks

---

## TODOs

## Wave 1 — Verification-Only (3 already-fixed tickets)

- [x] 1. T033 — Verify tRPC error transform fix, move to done/

  **What to do**:
  - Verify commit `b77c5db` fixes the tRPC errorFormatter issue described in `.tickets/T033-trpc-error-transform-broken.md`
  - Run `bun test packages/backend/tests/core/` — confirm all passing
  - Move `.tickets/T033-trpc-error-transform-broken.md` to `.tickets/done/`
  - Commit: `chore(T033): Verify already-fixed, move ticket to done`

  **Must NOT do**:
  - Do NOT modify any source code — this is verification only
  - Do NOT add new test files — existing tests suffice

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T035, T087)
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T033-trpc-error-transform-broken.md` — Ticket description
  - `packages/backend/src/api/trpc.ts` — File where fix was applied
  - Commit `b77c5db` — The fix commit

  **Acceptance Criteria**:
  - [ ] T033 file moved to `.tickets/done/`
  - [ ] `bun test packages/backend/tests/core/` passes

  **QA Scenarios**:
  ```
  Scenario: Verify T033 already fixed
    Tool: Bash
    Preconditions: Working tree clean
    Steps:
      1. `git log --oneline | grep b77c5db` → confirm commit exists
      2. `bun test packages/backend/tests/core/` → all pass
      3. `ls .tickets/done/T033*` → file exists
    Expected Result: Commit found, tests pass, ticket in done/
    Evidence: .sisyphus/evidence/task-1-t033-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(T033): Verify already-fixed, move ticket to done`
  - Files: `.tickets/T033-trpc-error-transform-broken.md` (moved)
  - Pre-commit: `bun test packages/backend/tests/core/`

- [x] 2. T035 — Verify root bun test fixes, move to done/

  **What to do**:
  - Verify commits `96b9d63` and `d2565f0` fix the root bun test issues described in `.tickets/T035-root-bun-test-fails-86-tests.md`
  - Run `bun test packages/backend/` — confirm passing
  - Move `.tickets/T035-root-bun-test-fails-86-tests.md` to `.tickets/done/`
  - Commit: `chore(T035): Verify already-fixed, move ticket to done`

  **Must NOT do**:
  - Do NOT modify source code
  - Do NOT add new test files

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T033, T087)
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T035-root-bun-test-fails-86-tests.md`
  - Commits `96b9d63`, `d2565f0`

  **Acceptance Criteria**:
  - [ ] T035 file moved to `.tickets/done/`
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Verify T035 already fixed
    Tool: Bash
    Steps:
      1. `git log --oneline | grep 96b9d63` → confirm commit exists
      2. `bun test packages/backend/` → all pass
      3. `ls .tickets/done/T035*` → file exists
    Expected Result: Commit found, tests pass, ticket in done/
    Evidence: .sisyphus/evidence/task-2-t035-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(T035): Verify already-fixed, move ticket to done`
  - Files: `.tickets/T035-root-bun-test-fails-86-tests.md` (moved)
  - Pre-commit: `bun test packages/backend/`

- [x] 3. T087 — Verify hot-reload dev workflow, move to done/

  **What to do**:
  - Verify commit `23f6a4f` implements the hot-reload dev workflow described in `.tickets/T087-hot-reloadable-dev-workflow.md`
  - Run `bun test packages/backend/` — confirm no regressions
  - Move `.tickets/T087-hot-reloadable-dev-workflow.md` to `.tickets/done/`
  - Commit: `chore(T087): Verify already-fixed, move ticket to done`

  **Must NOT do**:
  - Do NOT modify source code

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T033, T035)
  - **Parallel Group**: Wave 1
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T087-hot-reloadable-dev-workflow.md`
  - Commit `23f6a4f`

  **Acceptance Criteria**:
  - [ ] T087 file moved to `.tickets/done/`
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Verify T087 already fixed
    Tool: Bash
    Steps:
      1. `git log --oneline | grep 23f6a4f` → confirm commit exists
      2. `bun test packages/backend/` → all pass
      3. `ls .tickets/done/T087*` → file exists
    Expected Result: Commit found, tests pass, ticket in done/
    Evidence: .sisyphus/evidence/task-3-t087-verify.txt
  ```

  **Commit**: YES
  - Message: `chore(T087): Verify already-fixed, move ticket to done`
  - Files: `.tickets/T087-hot-reloadable-dev-workflow.md` (moved)
  - Pre-commit: `bun test packages/backend/`

---

## Wave 2 — Security Critical

- [x] 4. T036 — Fix SQL injection in log purge

  **What to do**:
  - Replace `sql.raw(String(this.retentionDays))` in `packages/backend/src/core/logging/logger.ts:68` with Drizzle parameterized query
  - Use Drizzle's `sql` template literal or `.where()` with proper parameter binding
  - Add test: verify purge works with valid retention days, verify no SQL injection possible with malicious input
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `sql.raw()` anywhere in the fix
  - Do NOT change the purgeOldLogs method signature or behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T041, T042, T052, T070)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T036-sql-raw-injection-log-purge.md` — Full ticket
  - `packages/backend/src/core/logging/logger.ts:68` — The vulnerable line
  - `packages/backend/src/db/connection.ts` — Drizzle setup, `createMemoryDb()` for tests
  - `packages/backend/tests/core/logging/logger.test.ts` — Existing test patterns

  **Acceptance Criteria**:
  - [ ] No `sql.raw()` calls remain in logger.ts
  - [ ] `bun test packages/backend/tests/core/logging/` passes with new test
  - [ ] Purge still correctly deletes logs older than retention days

  **QA Scenarios**:
  ```
  Scenario: SQL injection no longer possible
    Tool: Bash
    Steps:
      1. `grep -r "sql.raw" packages/backend/src/core/logging/logger.ts` → no output (no sql.raw)
      2. `bun test packages/backend/tests/core/logging/` → all pass
      3. Verify purge test with retentionDays=7 works correctly
    Expected Result: No sql.raw, tests pass, purge functional
    Evidence: .sisyphus/evidence/task-4-t036-sql-fix.txt

  Scenario: Malicious retentionDays handled safely
    Tool: Bash
    Steps:
      1. New test: pass retentionDays as string like "7; DROP TABLE logs" → should either error or treat as invalid, NOT execute raw SQL
      2. `bun test packages/backend/tests/core/logging/` → pass
    Expected Result: Injection attempt safely handled
    Evidence: .sisyphus/evidence/task-4-t036-injection-safe.txt
  ```

  **Commit**: YES
  - Message: `fix(T036): Replace sql.raw with parameterized query in log purge`
  - Files: `packages/backend/src/core/logging/logger.ts`, `packages/backend/tests/core/logging/logger.test.ts`
  - Pre-commit: `bun test packages/backend/tests/core/logging/`

- [x] 5. T041 — Fix encryption key file permissions

  **What to do**:
  - Enforce restrictive file permissions (0600) on the encryption key file in `packages/backend/src/core/auth/encryption.ts`
  - When writing the key file, explicitly set `mode: 0o600`
  - When reading, verify permissions are restrictive; warn or error if too permissive
  - Add test for permission enforcement
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the encryption algorithm
  - Do NOT move the key file location

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T036, T042, T052, T070)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T041-encryption-key-file-permissions.md`
  - `packages/backend/src/core/auth/encryption.ts` — Key file handling
  - `packages/backend/tests/core/auth/encryption.test.ts` — Existing tests

  **Acceptance Criteria**:
  - [ ] Key file written with 0600 permissions
  - [ ] `bun test packages/backend/tests/core/auth/` passes with new test
  - [ ] Existing encryption tests still pass

  **QA Scenarios**:
  ```
  Scenario: Key file has restrictive permissions
    Tool: Bash
    Steps:
      1. `bun test packages/backend/tests/core/auth/encryption.test.ts` → pass
      2. Test asserts key file mode is 0o600
    Expected Result: Test passes, permissions enforced
    Evidence: .sisyphus/evidence/task-5-t041-perms.txt
  ```

  **Commit**: YES
  - Message: `fix(T041): Enforce restrictive permissions on encryption key file`
  - Files: `packages/backend/src/core/auth/encryption.ts`, `packages/backend/tests/core/auth/encryption.test.ts`
  - Pre-commit: `bun test packages/backend/tests/core/auth/encryption.test.ts`

- [x] 6. T042 — Stop admin token logging to stdout

  **What to do**:
  - Remove or redact admin token from stdout logging in `packages/backend/src/server.ts`
  - When first-run token is generated, log a masked version (e.g., "rl-****xxxx") instead of full token
  - Add a method or config to retrieve the full token securely (env var or file)
  - Add test: verify token is not logged in full to stdout
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT remove the first-run token generation feature
  - Do NOT change the token format

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T036, T041, T052, T070)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T042-admin-token-logged-stdout.md`
  - `packages/backend/src/server.ts` — Where token is logged
  - `packages/backend/src/core/auth/` — Auth module

  **Acceptance Criteria**:
  - [ ] Admin token not logged in full to stdout
  - [ ] `bun test packages/backend/` passes with new test
  - [ ] First-run flow still works correctly

  **QA Scenarios**:
  ```
  Scenario: Token not leaked in stdout
    Tool: Bash
    Steps:
      1. `grep -r "console.log" packages/backend/src/server.ts` → no full token logged
      2. `bun test packages/backend/` → pass
    Expected Result: No full token in stdout, tests pass
    Evidence: .sisyphus/evidence/task-6-t042-no-stdout-token.txt
  ```

  **Commit**: YES
  - Message: `fix(T042): Mask admin token in stdout, never log full value`
  - Files: `packages/backend/src/server.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [x] 7. T052 — Fix provider encrypted key type confusion

  **What to do**:
  - Fix the encrypted key field in `packages/backend/src/db/schema/providers.ts` — ensure it's properly typed as nullable or required based on actual usage
  - Verify all code paths that read/write the encrypted key handle null/undefined correctly
  - Add type guard or proper null check instead of non-null assertion
  - Add test: verify provider creation/update with and without API key
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the database schema in a breaking way (no column renames)
  - Do NOT use `as any` as a "fix"

  **Recommended Agent Profile**:
  - **Category**: `unspecified-low`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T036, T041, T042, T070)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T052-provider-encrypted-key-type-confusion.md`
  - `packages/backend/src/db/schema/providers.ts` — Schema definition
  - `packages/backend/src/core/provider/service.ts` — Service that uses the field
  - `packages/backend/src/core/proxy/handler.ts` — Reads encrypted key

  **Acceptance Criteria**:
  - [ ] No type confusion in encrypted key handling
  - [ ] `bun test packages/backend/` passes with new test
  - [ ] Provider CRUD with and without API key works

  **QA Scenarios**:
  ```
  Scenario: Provider with API key works
    Tool: Bash
    Steps:
      1. Create provider with API key → verify encrypted key stored
      2. Create provider without API key → verify no crash
      3. `bun test packages/backend/` → pass
    Expected Result: Both paths work, tests pass
    Evidence: .sisyphus/evidence/task-7-t052-type-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(T052): Fix encrypted key type confusion in provider schema`
  - Files: `packages/backend/src/db/schema/providers.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [x] 8. T070 — Fix Anthropic adapter missing apiKey

  **What to do**:
  - Fix `overrides?.apiKey as string` in `packages/backend/src/core/proxy/adapters/anthropic/adapter.ts` line ~41
  - Validate apiKey exists and is a non-empty string before using it
  - Throw a proper typed error if apiKey is missing (not just undefined cast)
  - Add test: verify Anthropic adapter throws meaningful error when no apiKey
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `as string` cast without validation
  - Do NOT silently proceed with undefined apiKey

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with T036, T041, T042, T052)
  - **Parallel Group**: Wave 2
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T070-anthropic-adapter-missing-apikey.md`
  - `packages/backend/src/core/proxy/adapters/anthropic/adapter.ts:41` — The `as string` cast
  - `packages/backend/tests/core/adapters/anthropic.test.ts` — Existing adapter tests

  **Acceptance Criteria**:
  - [ ] No `as string` cast on apiKey without validation
  - [ ] `bun test packages/backend/tests/core/adapters/` passes with new test
  - [ ] Meaningful error thrown when apiKey missing/undefined

  **QA Scenarios**:
  ```
  Scenario: Missing apiKey throws proper error
    Tool: Bash
    Steps:
      1. Test: call Anthropic adapter with no apiKey override → throws error with message about missing apiKey
      2. `bun test packages/backend/tests/core/adapters/anthropic.test.ts` → pass
    Expected Result: Typed error, not undefined behavior
    Evidence: .sisyphus/evidence/task-8-t070-apikey-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(T070): Validate apiKey before use in Anthropic adapter`
  - Files: `packages/backend/src/core/proxy/adapters/anthropic/adapter.ts`, test file
  - Pre-commit: `bun test packages/backend/tests/core/adapters/anthropic.test.ts`

---

## Wave 3 — Proxy + Handler Fixes (same-file sequential)

- [ ] 9. T037 — Mask provider errors from clients

  **What to do**:
  - In `packages/backend/src/core/proxy/handler.ts`, replace raw upstream error messages with generic error responses
  - Log the full upstream error server-side for debugging
  - Return sanitized error to client with generic message + correlation ID
  - Add test: verify raw provider error messages are NOT present in client response
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT remove error logging — log full details server-side
  - Do NOT change the error response format to use custom codes — use OpenAI-compatible error format

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — first in handler.ts chain
  - **Parallel Group**: Wave 3 (sequential start)
  - **Blocks**: T047, T054, T056, T071 (all touch handler.ts)
  - **Blocked By**: None

  **References**:
  - `.tickets/T037-provider-errors-leak-to-clients.md`
  - `packages/backend/src/core/proxy/handler.ts:171-175` — Error forwarding lines
  - `packages/backend/tests/core/proxy/handler.test.ts` — Existing handler tests

  **Acceptance Criteria**:
  - [ ] Raw upstream error messages not in client-facing error responses
  - [ ] Full error details logged server-side
  - [ ] `bun test packages/backend/tests/core/proxy/handler.test.ts` passes with new test

  **QA Scenarios**:
  ```
  Scenario: Provider error masked from client
    Tool: Bash
    Steps:
      1. Test: mock provider returning error with sensitive info (API key fragment, internal URL)
      2. Assert client response does NOT contain the sensitive info
      3. `bun test packages/backend/tests/core/proxy/handler.test.ts` → pass
    Expected Result: Generic error to client, full error logged
    Evidence: .sisyphus/evidence/task-9-t037-mask-errors.txt
  ```

  **Commit**: YES
  - Message: `fix(T037): Mask provider errors, log full details server-side`
  - Files: `packages/backend/src/core/proxy/handler.ts`, `packages/backend/tests/core/proxy/handler.test.ts`
  - Pre-commit: `bun test packages/backend/tests/core/proxy/handler.test.ts`

- [ ] 10. T040 — Fix unsafe role cast to enum

  **What to do**:
  - In `packages/backend/src/routes/proxy.ts:127`, replace `messages as Array<{ role: "system"|"user"|"assistant"; content: string }>` with proper Zod validation using `z.enum(["system", "user", "assistant"])`
  - Update `ChatCompletionSchema` messages to use `role: z.enum(["system", "user", "assistant"])` instead of `role: z.string()`
  - Add test: verify invalid roles are rejected, valid roles pass
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `as` type assertion as a "fix"
  - Do NOT add new role types beyond system/user/assistant (tool messages handled in T039)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — must be before T039 (both modify proxy.ts schema)
  - **Parallel Group**: Wave 3
  - **Blocks**: T039
  - **Blocked By**: None

  **References**:
  - `.tickets/T040-unsafe-role-cast-enum.md`
  - `packages/backend/src/routes/proxy.ts:11-22` — ChatCompletionSchema
  - `packages/backend/src/routes/proxy.ts:127` — The unsafe cast line

  **Acceptance Criteria**:
  - [ ] No `as` type assertion for message roles
  - [ ] `z.enum(["system", "user", "assistant"])` used in schema
  - [ ] `bun test packages/backend/` passes with new test

  **QA Scenarios**:
  ```
  Scenario: Invalid role rejected by schema
    Tool: Bash
    Steps:
      1. Test: send message with role="invalid" → Zod validation error
      2. Test: send message with role="system" → passes
      3. `bun test packages/backend/` → pass
    Expected Result: Schema validates roles, no unsafe cast
    Evidence: .sisyphus/evidence/task-10-t040-enum-role.txt
  ```

  **Commit**: YES
  - Message: `fix(T040): Replace unsafe role cast with z.enum validation`
  - Files: `packages/backend/src/routes/proxy.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 11. T039 — Expand ChatCompletionSchema to accept all OpenAI params

  **What to do**:
  - Add `.passthrough()` to `ChatCompletionSchema` in `packages/backend/src/routes/proxy.ts:11-22` so unknown params pass through instead of being stripped
  - This ensures temperature, top_p, max_tokens, tools, tool_choice, response_format, etc. are forwarded to providers
  - Update ProxyRequest construction (line 126-130) to forward all parsed params, not just model/messages/stream
  - Add test: verify params like temperature, max_tokens, tools are preserved in the forwarded request
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT remove the schema validation entirely — still validate model and messages
  - Do NOT hardcode every OpenAI param — use passthrough to future-proof

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — must be after T040 (both modify same schema)
  - **Parallel Group**: Wave 3
  - **Blocks**: T047, T056 (proxy.ts)
  - **Blocked By**: T040

  **References**:
  - `.tickets/T039-proxy-schema-strips-openai-params.md`
  - `packages/backend/src/routes/proxy.ts:11-22` — Current ChatCompletionSchema
  - `packages/backend/src/routes/proxy.ts:122-130` — ProxyRequest construction
  - OpenAI API docs: all supported params for /v1/chat/completions
  - `packages/backend/src/core/proxy/adapters/openai/adapter.ts` — Where params should be forwarded

  **Acceptance Criteria**:
  - [ ] `.passthrough()` added to ChatCompletionSchema
  - [ ] All OpenAI params forwarded to providers (not just model/messages/stream)
  - [ ] `bun test packages/backend/` passes with new test
  - [ ] Existing tests still pass

  **QA Scenarios**:
  ```
  Scenario: temperature and tools preserved
    Tool: Bash
    Steps:
      1. Test: send request with temperature=0.7, tools=[{type:"function",...}] → forwarded to provider
      2. Assert parsed output contains temperature and tools
      3. `bun test packages/backend/` → pass
    Expected Result: Passthrough preserves all params
    Evidence: .sisyphus/evidence/task-11-t039-passthrough.txt

  Scenario: Invalid model still rejected
    Tool: Bash
    Steps:
      1. Test: send request with missing model → Zod validation error
      2. `bun test packages/backend/` → pass
    Expected Result: Core validation still works
    Evidence: .sisyphus/evidence/task-11-t039-validation.txt
  ```

  **Commit**: YES
  - Message: `fix(T039): Add passthrough to ChatCompletionSchema, forward all params`
  - Files: `packages/backend/src/routes/proxy.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 12. T047 — Pass request ID from proxy to handler

  **What to do**:
  - In `packages/backend/src/routes/proxy.ts`, generate a request ID and pass it to ProxyHandler
  - In `packages/backend/src/core/proxy/handler.ts`, accept request ID in constructor or method call
  - Ensure the same request ID is used in all log entries for a single request
  - Add test: verify consistent request ID across proxy + handler logs
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the handler's public API beyond adding the request ID parameter
  - Do NOT generate a new request ID per handler method call

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — touches proxy.ts + handler.ts (after T040, T039)
  - **Parallel Group**: Wave 3
  - **Blocks**: Nothing
  - **Blocked By**: T040, T039, T037

  **References**:
  - `.tickets/T047-request-id-mismatch-proxy-handler.md`
  - `packages/backend/src/routes/proxy.ts:132` — Where handler is called
  - `packages/backend/src/core/proxy/handler.ts` — Where request ID should be used

  **Acceptance Criteria**:
  - [ ] Single request ID generated per request, passed through to handler
  - [ ] `bun test packages/backend/` passes with new test

  **QA Scenarios**:
  ```
  Scenario: Request ID consistent across logs
    Tool: Bash
    Steps:
      1. Test: make request, capture logs, verify same request ID in proxy + handler log entries
      2. `bun test packages/backend/` → pass
    Expected Result: Single ID per request in all log entries
    Evidence: .sisyphus/evidence/task-12-t047-request-id.txt
  ```

  **Commit**: YES
  - Message: `fix(T047): Pass consistent request ID from proxy to handler`
  - Files: `packages/backend/src/routes/proxy.ts`, `packages/backend/src/core/proxy/handler.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 13. T056 — Fix handleNonStream text matching too broad

  **What to do**:
  - Fix the overly broad text matching in `packages/backend/src/core/proxy/handler.ts` in the `handleNonStream` function
  - Make the content-type check more specific (exact match instead of includes)
  - Add test: verify only exact content-type matches trigger non-stream handling
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the stream/non-stream decision logic fundamentally

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — touches handler.ts (after T037)
  - **Parallel Group**: Wave 3
  - **Blocks**: Nothing
  - **Blocked By**: T037

  **References**:
  - `.tickets/T056-handleNonStream-text-matching-too-broad.md`
  - `packages/backend/src/core/proxy/handler.ts` — handleNonStream function

  **Acceptance Criteria**:
  - [ ] Content-type matching is specific, not overly broad
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Only exact content-type triggers non-stream
    Tool: Bash
    Steps:
      1. Test: mock response with loose content-type match → rejected
      2. Test: mock response with exact match → handled correctly
      3. `bun test packages/backend/` → pass
    Expected Result: Specific content-type matching
    Evidence: .sisyphus/evidence/task-13-t056-content-type.txt
  ```

  **Commit**: YES
  - Message: `fix(T056): Make content-type matching specific in handleNonStream`
  - Files: `packages/backend/src/core/proxy/handler.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 14. T075 — Fix fragile parse-dependents regex

  **What to do**:
  - Replace fragile regex in the parse-dependents logic with a more robust parsing approach
  - Use proper parsing instead of regex for structured data
  - Add test: verify various input formats handled correctly
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use another fragile regex as replacement — use proper parsing

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (different files from other Wave 3 tasks)
  - **Parallel Group**: Wave 3
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T075-parse-dependents-regex-fragile.md`
  - `packages/shared/src/schemas/endpoint.ts` — Schema with regex
  - `packages/backend/src/api/routers/endpoints.ts` — Router using regex

  **Acceptance Criteria**:
  - [ ] No fragile regex used for parsing structured data
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Various endpoint path formats handled
    Tool: Bash
    Steps:
      1. Test: paths with special chars, unicode, edge cases → all handled correctly
      2. `bun test packages/backend/` → pass
    Expected Result: Robust parsing without regex
    Evidence: .sisyphus/evidence/task-14-t075-regex-fix.txt
  ```

  **Commit**: YES
  - Message: `fix(T075): Replace fragile regex with robust parsing`
  - Files: `packages/shared/src/schemas/endpoint.ts`, `packages/backend/src/api/routers/endpoints.ts`, test file
  - Pre-commit: `bun test packages/backend/`

---

## Wave 4 — Server Infrastructure + CORS + Shutdown

- [ ] 15. T044 — Add CORS configuration

  **What to do**:
  - Add CORS middleware to `packages/backend/src/server.ts` using Hono's built-in CORS middleware
  - Configure allowed origins, methods, and headers
  - Make CORS origins configurable via env var (default: same-origin only)
  - Add test: verify CORS headers present in responses, verify preflight works
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT set `origin: "*"` as default — that's insecure
  - Do NOT break existing proxy endpoint functionality

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — touches server.ts
  - **Parallel Group**: Wave 4 (first)
  - **Blocks**: T064
  - **Blocked By**: T037

  **References**:
  - `.tickets/T044-no-cors-configuration.md`
  - `packages/backend/src/server.ts` — Where CORS middleware goes
  - Hono CORS docs: `import { cors } from 'hono/cors'`

  **Acceptance Criteria**:
  - [ ] CORS middleware added with configurable origins
  - [ ] Default is restrictive (same-origin)
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: CORS headers in response
    Tool: Bash
    Steps:
      1. Test: OPTIONS request → returns Access-Control-Allow-Origin header
      2. Test: GET request with Origin header → CORS headers present
      3. `bun test packages/backend/` → pass
    Expected Result: CORS configured and working
    Evidence: .sisyphus/evidence/task-15-t044-cors.txt
  ```

  **Commit**: YES
  - Message: `fix(T044): Add configurable CORS middleware`
  - Files: `packages/backend/src/server.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 16. T064 — Add graceful shutdown for in-flight streams

  **What to do**:
  - In `packages/backend/src/server.ts`, add signal handlers (SIGTERM, SIGINT) that drain in-flight requests before shutting down
  - Track active streaming connections; on signal, stop accepting new requests and wait for active ones to complete (with timeout)
  - Add test: verify server shuts down gracefully with active connections
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use process.exit() in signal handlers
  - Do NOT set shutdown timeout below 5 seconds

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — touches server.ts (after T044)
  - **Parallel Group**: Wave 4
  - **Blocks**: T086
  - **Blocked By**: T044

  **References**:
  - `.tickets/T064-no-graceful-shutdown-streams.md`
  - `packages/backend/src/server.ts` — Where signal handlers go
  - Bun server API: `server.stop()` for graceful shutdown

  **Acceptance Criteria**:
  - [ ] SIGTERM/SIGINT handlers installed
  - [ ] In-flight requests drain before shutdown
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Graceful shutdown with active stream
    Tool: interactive_bash (tmux)
    Steps:
      1. Start server with active streaming request
      2. Send SIGTERM
      3. Verify server completes active request before shutting down
    Expected Result: Active stream completes, then server exits
    Evidence: .sisyphus/evidence/task-16-t064-graceful-shutdown.txt
  ```

  **Commit**: YES
  - Message: `fix(T064): Add graceful shutdown with request draining`
  - Files: `packages/backend/src/server.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 17. T054 — Abort upstream request on client disconnect

  **What to do**:
  - In `packages/backend/src/core/proxy/handler.ts`, detect client disconnect and abort the upstream request using AbortController
  - Pass request's AbortSignal through to the fetch call
  - Add test: verify upstream request is cancelled when client disconnects
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT add timeout logic — this ticket is about client disconnect only

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (different handler.ts section from T071)
  - **Parallel Group**: Wave 4
  - **Blocks**: Nothing
  - **Blocked By**: T037

  **References**:
  - `.tickets/T054-no-upstream-abort-on-disconnect.md`
  - `packages/backend/src/core/proxy/handler.ts:346-348` — Where upstream fetch call is made

  **Acceptance Criteria**:
  - [ ] Upstream fetch aborted when client disconnects
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Upstream aborted on client disconnect
    Tool: Bash
    Steps:
      1. Test: start request, simulate client abort → upstream fetch aborted
      2. `bun test packages/backend/` → pass
    Expected Result: AbortSignal cancels upstream
    Evidence: .sisyphus/evidence/task-17-t054-abort-upstream.txt
  ```

  **Commit**: YES
  - Message: `fix(T054): Abort upstream request on client disconnect`
  - Files: `packages/backend/src/core/proxy/handler.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 18. T071 — Cancel stream reader on error

  **What to do**:
  - In `packages/backend/src/core/proxy/handler.ts`, ensure the ReadableStream reader is cancelled in error paths
  - Add try/finally to streaming sections that cancel the reader in finally block
  - Add test: verify reader is cancelled when stream processing errors occur
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT add .catch() to reader.cancel() that swallows errors

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (different handler.ts section from T054)
  - **Parallel Group**: Wave 4
  - **Blocks**: Nothing
  - **Blocked By**: T037

  **References**:
  - `.tickets/T071-stream-reader-not-cancelled-on-error.md`
  - `packages/backend/src/core/proxy/handler.ts:343` — Where reader is obtained

  **Acceptance Criteria**:
  - [ ] Reader cancelled in all error paths
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Reader cancelled on stream error
    Tool: Bash
    Steps:
      1. Test: mock upstream returning error mid-stream → reader.cancel() called
      2. `bun test packages/backend/` → pass
    Expected Result: No resource leak, reader properly cancelled
    Evidence: .sisyphus/evidence/task-18-t071-reader-cancel.txt
  ```

  **Commit**: YES
  - Message: `fix(T071): Cancel stream reader in error paths`
  - Files: `packages/backend/src/core/proxy/handler.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 19. T061 — Fix inconsistent auth header parsing

  **What to do**:
  - Unify auth header parsing in `packages/backend/src/routes/proxy.ts` — use a single function to extract Bearer token
  - Ensure proxy route and admin routes use the same parsing logic
  - Add test: verify consistent parsing across all routes
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the auth mechanism — just unify the parsing logic

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO — touches proxy.ts (after Wave 3 changes)
  - **Parallel Group**: Wave 4
  - **Blocks**: Nothing
  - **Blocked By**: T039, T040

  **References**:
  - `.tickets/T061-inconsistent-auth-header-parsing.md`
  - `packages/backend/src/routes/proxy.ts` — Proxy route auth parsing
  - `packages/backend/src/core/auth/` — Auth module

  **Acceptance Criteria**:
  - [ ] Single auth header parsing function used everywhere
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Consistent auth parsing
    Tool: Bash
    Steps:
      1. Test: Bearer token in various formats (with/without "Bearer ", case variations)
      2. All routes parse identically
      3. `bun test packages/backend/` → pass
    Expected Result: Unified parsing logic
    Evidence: .sisyphus/evidence/task-19-t061-auth-parse.txt
  ```

  **Commit**: YES
  - Message: `fix(T061): Unify auth header parsing across routes`
  - Files: `packages/backend/src/routes/proxy.ts`, `packages/backend/src/core/auth/`, test file
  - Pre-commit: `bun test packages/backend/`

---

## Wave 5 — Type Safety + Code Quality (Backend Services)

- [ ] 20. T048 — Document sync DB tradeoff in service files

  **What to do**:
  - Add code comments in `packages/backend/src/core/provider/service.ts`, `endpoint/service.ts`, `model/service.ts` documenting the sync DB call tradeoff
  - Note: "acceptable for homelab scale" per ticket text
  - Add a TODO comment noting async migration path for future
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT migrate to async — this ticket is documentation only
  - Do NOT change any runtime behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: T049, T050
  - **Blocked By**: None

  **References**:
  - `.tickets/T048-sync-db-blocks-event-loop.md`
  - `packages/backend/src/core/provider/service.ts` — `.run()` calls
  - `packages/backend/src/core/endpoint/service.ts` — `.run()` calls

  **Acceptance Criteria**:
  - [ ] Tradeoff documented in all service files with `.run()` calls
  - [ ] `bun test packages/backend/` passes (no behavior change)

  **QA Scenarios**:
  ```
  Scenario: Documentation added
    Tool: Bash
    Steps:
      1. `grep -c "homelab\|sync.*tradeoff\|async migration" packages/backend/src/core/provider/service.ts` → >0
      2. `bun test packages/backend/` → pass
    Expected Result: Comments present, tests pass
    Evidence: .sisyphus/evidence/task-20-t048-doc-sync.txt
  ```

  **Commit**: YES
  - Message: `docs(T048): Document sync DB call tradeoff in service files`
  - Files: `packages/backend/src/core/provider/service.ts`, `packages/backend/src/core/endpoint/service.ts`, `packages/backend/src/core/model/service.ts`
  - Pre-commit: `bun test packages/backend/`

- [ ] 21. T049 — Fix N+1 endpoint queries

  **What to do**:
  - Replace the N+1 query pattern in `packages/backend/src/core/endpoint/service.ts` with a single JOIN query
  - Instead of querying endpoints then looping to count models, use a single query with JOIN
  - Add test: verify endpoint listing returns correct model counts
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the endpoint listing API response format
  - Do NOT add new dependencies

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: T048

  **References**:
  - `.tickets/T049-n-plus-1-endpoint-queries.md`
  - `packages/backend/src/core/endpoint/service.ts` — The N+1 pattern
  - Drizzle ORM docs: JOIN syntax

  **Acceptance Criteria**:
  - [ ] Single query replaces loop queries
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: N+1 replaced with JOIN
    Tool: Bash
    Steps:
      1. Test: create 5 endpoints with varying model counts → listing returns correct counts
      2. `bun test packages/backend/` → pass
    Expected Result: Correct model counts, single query
    Evidence: .sisyphus/evidence/task-21-t049-n-plus-1.txt
  ```

  **Commit**: YES
  - Message: `fix(T049): Replace N+1 endpoint queries with JOIN`
  - Files: `packages/backend/src/core/endpoint/service.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 22. T050 — Deduplicate mapNotFound utility

  **What to do**:
  - Extract the duplicated `mapNotFound` utility in `packages/backend/src/api/routers/providers.ts` and `endpoints.ts` into a shared location
  - Delete the duplicated implementations
  - Add test: verify shared utility works for both router contexts
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the utility's behavior — just move it

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T050-duplicated-mapnotfound-utility.md`
  - `packages/backend/src/api/routers/providers.ts` — mapNotFound definition
  - `packages/backend/src/api/routers/endpoints.ts` — mapNotFound definition (duplicate)

  **Acceptance Criteria**:
  - [ ] Single shared mapNotFound utility
  - [ ] No duplicated implementation
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: No duplicate mapNotFound
    Tool: Bash
    Steps:
      1. `grep -rn "mapNotFound" packages/backend/src/api/routers/` → single definition
      2. `bun test packages/backend/` → pass
    Expected Result: One definition, used in both routers
    Evidence: .sisyphus/evidence/task-22-t050-dedup.txt
  ```

  **Commit**: YES
  - Message: `refactor(T050): Extract shared mapNotFound utility`
  - Files: `packages/backend/src/api/routers/providers.ts`, `packages/backend/src/api/routers/endpoints.ts`, new shared file, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 23. T051 — Remove module-level side effects from index.ts

  **What to do**:
  - Remove side effects at module level in `packages/backend/src/index.ts` (e.g., console.log in tRPC middleware)
  - Move side effects to initialization functions called explicitly
  - Add test: verify importing module doesn't trigger side effects
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT remove necessary initialization — just defer it to explicit calls

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T051-module-level-side-effects-index.md`
  - `packages/backend/src/index.ts`
  - `packages/backend/src/api/trpc.ts` — tRPC middleware with console.log

  **Acceptance Criteria**:
  - [ ] No side effects on import
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Import without side effects
    Tool: Bash
    Steps:
      1. Test: import module → no console output
      2. `bun test packages/backend/` → pass
    Expected Result: Clean import, no side effects
    Evidence: .sisyphus/evidence/task-23-t051-side-effects.txt
  ```

  **Commit**: YES
  - Message: `fix(T051): Remove module-level side effects, defer to explicit init`
  - Files: `packages/backend/src/index.ts`, `packages/backend/src/api/trpc.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 24. T053 — Fix endpoint path regex mismatch

  **What to do**:
  - Fix the regex mismatch between shared schema validation and backend router in `packages/shared/src/schemas/endpoint.ts` and `packages/backend/src/api/routers/endpoints.ts`
  - Ensure both use the same validation rules for endpoint paths
  - Add test: verify path validation is consistent across schema and router
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT relax validation to "fix" the mismatch — align to the strictest rules

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T053-endpoint-path-regex-mismatch.md`
  - `packages/shared/src/schemas/endpoint.ts`
  - `packages/backend/src/api/routers/endpoints.ts`

  **Acceptance Criteria**:
  - [ ] Same validation rules in schema and router
  - [ ] `bun test packages/backend/` and `bun test packages/shared/` pass

  **QA Scenarios**:
  ```
  Scenario: Consistent path validation
    Tool: Bash
    Steps:
      1. Test: paths accepted by schema are also accepted by router and vice versa
      2. `bun test` → pass
    Expected Result: Aligned validation
    Evidence: .sisyphus/evidence/task-24-t053-regex-align.txt
  ```

  **Commit**: YES
  - Message: `fix(T053): Align endpoint path regex between schema and router`
  - Files: `packages/shared/src/schemas/endpoint.ts`, `packages/backend/src/api/routers/endpoints.ts`, test file
  - Pre-commit: `bun test packages/backend/ && bun test packages/shared/`

- [ ] 25. T057 — Cache checkFirstRun result

  **What to do**:
  - Cache the result of `checkFirstRun()` in `packages/backend/src/core/auth/` so it doesn't query DB on every request
  - Invalidate cache when admin token is generated (first-run completion)
  - Add test: verify DB is not queried on subsequent calls
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT cache indefinitely — invalidate on state change
  - Do NOT use a global mutable variable without invalidation strategy

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T057-checkfirstrun-queries-every-call.md`
  - `packages/backend/src/core/auth/` — Where checkFirstRun lives

  **Acceptance Criteria**:
  - [ ] checkFirstRun result cached
  - [ ] Cache invalidated on first-run completion
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Cached checkFirstRun
    Tool: Bash
    Steps:
      1. Test: call checkFirstRun twice → DB queried only once
      2. Test: after first-run completion → cache invalidated
      3. `bun test packages/backend/` → pass
    Expected Result: Cache hit on second call
    Evidence: .sisyphus/evidence/task-25-t057-cache-firstrun.txt
  ```

  **Commit**: YES
  - Message: `fix(T057): Cache checkFirstRun result with proper invalidation`
  - Files: `packages/backend/src/core/auth/`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 26. T062 — Reuse TextEncoder across chunks

  **What to do**:
  - Replace per-chunk `new TextEncoder()` with a module-level reusable instance in the streaming code
  - Add test: verify streaming produces same output with reused encoder
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change encoding behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T062-textencoder-allocation-per-chunk.md`
  - `packages/backend/src/core/proxy/` — Streaming code

  **Acceptance Criteria**:
  - [ ] Single TextEncoder instance reused
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Streaming with reused encoder
    Tool: Bash
    Steps:
      1. `grep -n "new TextEncoder" packages/backend/src/core/proxy/` → 0 hits in streaming loop
      2. `bun test packages/backend/` → pass
    Expected Result: No per-chunk allocation
    Evidence: .sisyphus/evidence/task-26-t062-textencoder.txt
  ```

  **Commit**: YES
  - Message: `perf(T062): Reuse TextEncoder across streaming chunks`
  - Files: `packages/backend/src/core/proxy/`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 27. T063 — Fix mergeUsage token arithmetic

  **What to do**:
  - Fix token arithmetic in `mergeUsage` function — ensure prompt_tokens, completion_tokens, total_tokens are correctly summed
  - Add test: verify token counts add up correctly with multiple usage objects
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the usage response format

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T063-mergeusage-token-arithmetic.md`
  - `packages/backend/src/core/proxy/` — Where mergeUsage lives

  **Acceptance Criteria**:
  - [ ] Token arithmetic correct
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Token counts add up
    Tool: Bash
    Steps:
      1. Test: merge two usage objects → total = prompt + completion
      2. `bun test packages/backend/` → pass
    Expected Result: Correct arithmetic
    Evidence: .sisyphus/evidence/task-27-t063-token-arith.txt
  ```

  **Commit**: YES
  - Message: `fix(T063): Correct token arithmetic in mergeUsage`
  - Files: `packages/backend/src/core/proxy/`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 28. T065 — Use crypto.getRandomValues for apiKey prefix

  **What to do**:
  - Replace hardcoded prefix in apiKey generation in `packages/backend/src/core/provider/service.ts` with `crypto.getRandomValues()`
  - Ensure generated API keys use cryptographically secure randomness
  - Add test: verify generated key is unique and uses crypto API
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change the key format or length

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T065-regenerate-apikey-hardcoded-prefix.md`
  - `packages/backend/src/core/provider/service.ts`

  **Acceptance Criteria**:
  - [ ] crypto.getRandomValues used for key generation
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Secure key generation
    Tool: Bash
    Steps:
      1. `grep -n "getRandomValues\|crypto.random" packages/backend/src/core/provider/service.ts` → found
      2. `bun test packages/backend/` → pass
    Expected Result: Cryptographic randomness used
    Evidence: .sisyphus/evidence/task-28-t065-crypto-key.txt
  ```

  **Commit**: YES
  - Message: `fix(T065): Use crypto.getRandomValues for apiKey generation`
  - Files: `packages/backend/src/core/provider/service.ts`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 29. T066 — Use performance.now for latency measurement

  **What to do**:
  - Replace `Date.now()` with `performance.now()` for latency measurement in `packages/backend/src/core/proxy/`
  - `performance.now()` gives sub-millisecond precision; Date.now() is ms-precision only
  - Add test: verify latency is measured with sub-ms precision
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change latency units in logs/responses — still report in ms

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T066-date-now-vs-performance-now.md`
  - `packages/backend/src/core/proxy/` — Where latency is measured

  **Acceptance Criteria**:
  - [ ] `performance.now()` used for timing
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: High-precision latency
    Tool: Bash
    Steps:
      1. `grep -n "Date.now\|performance.now" packages/backend/src/core/proxy/` → only performance.now for timing
      2. `bun test packages/backend/` → pass
    Expected Result: performance.now used
    Evidence: .sisyphus/evidence/task-29-t066-perf-now.txt
  ```

  **Commit**: YES
  - Message: `perf(T066): Use performance.now for latency measurement`
  - Files: `packages/backend/src/core/proxy/`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 30. T072 — Fix mapServiceError sync catch

  **What to do**:
  - Fix `mapServiceError` in `packages/backend/src/core/proxy/` to catch async rejections, not just synchronous errors
  - Use try/catch with async/await pattern instead of sync-only `.catch()`
  - Add test: verify async errors from services are properly caught and mapped
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT silently swallow errors

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T072-mapserviceerror-sync-catch-only.md`
  - `packages/backend/src/core/proxy/` — Where mapServiceError lives

  **Acceptance Criteria**:
  - [ ] Both sync and async errors caught
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Async error caught
    Tool: Bash
    Steps:
      1. Test: service throws async rejection → mapServiceError catches it
      2. `bun test packages/backend/` → pass
    Expected Result: Async errors mapped correctly
    Evidence: .sisyphus/evidence/task-30-t072-async-catch.txt
  ```

  **Commit**: YES
  - Message: `fix(T072): Handle async rejections in mapServiceError`
  - Files: `packages/backend/src/core/proxy/`, test file
  - Pre-commit: `bun test packages/backend/`

---

## Wave 6 — Frontend Fixes

- [ ] 31. T045 — Fix useParams non-null assertion

  **What to do**:
  - Replace `useParams().id!` non-null assertions in frontend detail pages with proper null checks
  - Add loading/error state for missing params
  - Files: `packages/frontend/src/features/endpoints/detail.tsx`, `packages/frontend/src/features/providers/detail.tsx`, `packages/frontend/src/features/models/detail.tsx`
  - Add test: verify component handles missing route params gracefully
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT add `!` assertions elsewhere as a "fix"

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T045-useparams-non-null-assertion.md`
  - `packages/frontend/src/features/endpoints/detail.tsx`
  - `packages/frontend/src/features/providers/detail.tsx`
  - `packages/frontend/src/features/models/detail.tsx`

  **Acceptance Criteria**:
  - [ ] No non-null assertions on useParams
  - [ ] `cd packages/frontend && npx vitest run` passes
  - [ ] Components handle missing params gracefully

  **QA Scenarios**:
  ```
  Scenario: Missing route param handled
    Tool: Bash
    Steps:
      1. `grep -rn "useParams.*!" packages/frontend/src/` → 0 hits
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: No unsafe assertions, graceful handling
    Evidence: .sisyphus/evidence/task-31-t045-useparams.txt
  ```

  **Commit**: YES
  - Message: `fix(T045): Replace useParams non-null assertions with null checks`
  - Files: `packages/frontend/src/features/endpoints/detail.tsx`, `packages/frontend/src/features/providers/detail.tsx`, `packages/frontend/src/features/models/detail.tsx`, test files
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 32. T046 — Fix unsafe provider response casts

  **What to do**:
  - Replace unsafe type casts in `packages/frontend/src/features/providers/` with proper type guards
  - Use runtime validation or Zod parsing for API response data
  - Add test: verify component handles unexpected response shapes
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `as` type assertions as a "fix"

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T046-unsafe-provider-response-casts.md`
  - `packages/frontend/src/features/providers/hooks/useProviders.ts`
  - `packages/frontend/src/features/providers/detail.tsx`

  **Acceptance Criteria**:
  - [ ] No unsafe `as` casts on API response data
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: Safe response handling
    Tool: Bash
    Steps:
      1. `grep -rn " as " packages/frontend/src/features/providers/` → no unsafe casts on response data
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: Type-safe response handling
    Evidence: .sisyphus/evidence/task-32-t046-casts.txt
  ```

  **Commit**: YES
  - Message: `fix(T046): Replace unsafe provider response casts with type guards`
  - Files: `packages/frontend/src/features/providers/`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 33. T055 — Fix non-null assertion in log formatting

  **What to do**:
  - Replace non-null assertions in `packages/backend/src/core/logging/` with proper null checks
  - Add fallback values for nullable fields in log formatting
  - Add test: verify log formatting handles null/undefined fields
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT log `undefined` or `null` strings

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T055-non-null-assertion-logs-before.md`
  - `packages/backend/src/core/logging/`

  **Acceptance Criteria**:
  - [ ] No non-null assertions in log formatting
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: Safe log formatting
    Tool: Bash
    Steps:
      1. `grep -n "!" packages/backend/src/core/logging/` → no non-null assertions
      2. `bun test packages/backend/` → pass
    Expected Result: Null-safe log formatting
    Evidence: .sisyphus/evidence/task-33-t055-log-null.txt
  ```

  **Commit**: YES
  - Message: `fix(T055): Replace non-null assertions with null checks in log formatting`
  - Files: `packages/backend/src/core/logging/`, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 34. T069 — Fix customFetch swallowing non-401 errors

  **What to do**:
  - In `packages/frontend/src/lib/trpc.ts`, fix the customFetch to only handle 401 specifically, not swallow all non-200 responses
  - Other HTTP errors should propagate to be handled by tRPC error handling
  - Add test: verify non-401 errors are properly surfaced
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change 401 handling behavior

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: T058
  - **Blocked By**: None

  **References**:
  - `.tickets/T069-customfetch-swallows-non-401.md`
  - `packages/frontend/src/lib/trpc.ts`

  **Acceptance Criteria**:
  - [ ] Non-401 errors properly propagated
  - [ ] 401 handling unchanged
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: 500 error surfaced
    Tool: Bash
    Steps:
      1. Test: mock 500 response → error propagated to caller
      2. Test: mock 401 response → redirect to login unchanged
      3. `cd packages/frontend && npx vitest run` → pass
    Expected Result: Only 401 handled specially
    Evidence: .sisyphus/evidence/task-34-t069-customfetch.txt
  ```

  **Commit**: YES
  - Message: `fix(T069): Only handle 401 in customFetch, propagate other errors`
  - Files: `packages/frontend/src/lib/trpc.ts`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 35. T068 — Fix format mutation error any type

  **What to do**:
  - Type the error in mutation onError handlers properly instead of using `any`
  - Use `TRPCClientError` type or proper typed error
  - Add test: verify error type is properly narrowed
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `as any` as a "fix"

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: T088
  - **Blocked By**: None

  **References**:
  - `.tickets/T068-format-mutation-error-any-type.md`
  - `packages/frontend/src/lib/trpc.ts`

  **Acceptance Criteria**:
  - [ ] No `any` type on error parameter
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: Properly typed error
    Tool: Bash
    Steps:
      1. `grep -rn "error.*any\|: any" packages/frontend/src/lib/trpc.ts` → 0 hits
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: No any-typed errors
    Evidence: .sisyphus/evidence/task-35-t068-error-type.txt
  ```

  **Commit**: YES
  - Message: `fix(T068): Replace error any type with proper TRPCClientError`
  - Files: `packages/frontend/src/lib/trpc.ts`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 36. T059 — Fix RequireAuth render redirect race

  **What to do**:
  - Fix the race condition in `packages/frontend/src/features/auth/` RequireAuth component
  - Ensure auth check completes before rendering redirect vs protected content
  - Add test: verify no flash of protected content during redirect
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT add arbitrary setTimeout delays

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T069)
  - **Parallel Group**: Wave 6
  - **Blocks**: T088
  - **Blocked By**: None

  **References**:
  - `.tickets/T059-requireauth-render-redirect-race.md`
  - `packages/frontend/src/features/auth/`

  **Acceptance Criteria**:
  - [ ] No race condition in auth check + redirect
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: No flash on redirect
    Tool: Bash
    Steps:
      1. Test: render RequireAuth when unauthenticated → no protected content visible before redirect
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: Clean redirect, no flash
    Evidence: .sisyphus/evidence/task-36-t059-redirect-race.txt
  ```

  **Commit**: YES
  - Message: `fix(T059): Fix RequireAuth redirect race condition`
  - Files: `packages/frontend/src/features/auth/`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 37. T058 — Fix 401 redirect race with concurrent requests

  **What to do**:
  - Fix concurrent 401 handling in `packages/frontend/src/lib/auth.tsx` — multiple simultaneous 401s should not cause multiple redirects
  - Deduplicate redirect calls
  - Add test: verify only one redirect happens with concurrent 401 responses
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT lose error information — capture all 401 error details

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (after T069)
  - **Parallel Group**: Wave 6
  - **Blocks**: T088
  - **Blocked By**: None

  **References**:
  - `.tickets/T058-401-redirect-race-concurrent.md`
  - `packages/frontend/src/lib/auth.tsx`

  **Acceptance Criteria**:
  - [ ] Single redirect on concurrent 401s
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: Concurrent 401s → single redirect
    Tool: Bash
    Steps:
      1. Test: fire 3 concurrent 401 responses → only 1 redirect
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: Deduped redirect
    Evidence: .sisyphus/evidence/task-37-t058-concurrent-401.txt
  ```

  **Commit**: YES
  - Message: `fix(T058): Deduplicate 401 redirect on concurrent requests`
  - Files: `packages/frontend/src/lib/auth.tsx`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

- [ ] 38. T060 — Remove provider apiKey from frontend type

  **What to do**:
  - Remove apiKey field from frontend-facing provider type (it should only exist in backend/shared types with proper protection)
  - Ensure apiKey never reaches the frontend bundle
  - Add test: verify provider type exposed to frontend does NOT contain apiKey
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT expose the apiKey to the frontend in any form

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T060-provider-apikey-exposed-frontend-type.md`
  - `packages/shared/src/schemas/provider.ts` — Provider schema
  - `packages/backend/src/api/routers/providers.ts` — Provider router (strip apiKey before sending)

  **Acceptance Criteria**:
  - [ ] apiKey not in frontend-accessible provider type
  - [ ] Backend still has access to apiKey for proxy operations
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: No apiKey in frontend type
    Tool: Bash
    Steps:
      1. `grep -rn "apiKey" packages/frontend/src/` → 0 hits on provider type
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: apiKey stripped from frontend type
    Evidence: .sisyphus/evidence/task-38-t060-apikey-strip.txt
  ```

  **Commit**: YES
  - Message: `fix(T060): Remove apiKey from frontend-facing provider type`
  - Files: `packages/shared/src/schemas/provider.ts`, `packages/backend/src/api/routers/providers.ts`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run && bun test packages/backend/`

- [ ] 39. T067 — Fix e2e auth state plain JSON

  **What to do**:
  - Fix auth state storage in e2e tests — use proper Playwright storageState instead of plain JSON
  - Ensure auth state is properly serialized/deserialized
  - Add test: verify e2e auth flow works correctly
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT change how the app stores auth state at runtime — only fix e2e test infrastructure

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T067-e2e-auth-state-plain-json.md`
  - `packages/frontend/tests/` — E2E test files
  - `packages/frontend/playwright.config.ts` — Playwright configuration

  **Acceptance Criteria**:
  - [ ] E2E auth state uses Playwright storageState API
  - [ ] `npx playwright test` passes

  **QA Scenarios**:
  ```
  Scenario: E2E auth flow works
    Tool: Bash
    Steps:
      1. `cd packages/frontend && npx playwright test tests/e2e/` → pass
    Expected Result: Auth state properly managed in e2e
    Evidence: .sisyphus/evidence/task-39-t067-e2e-auth.txt
  ```

  **Commit**: YES
  - Message: `fix(T067): Use Playwright storageState for e2e auth`
  - Files: `packages/frontend/tests/`, test file
  - Pre-commit: `cd packages/frontend && npx playwright test`

- [ ] 40. T073 — Fix toggle mutation stale cache

  **What to do**:
  - Fix cache invalidation for toggle mutations in frontend features
  - After toggling endpoint/provider, invalidate related queries
  - Add test: verify UI updates after toggle mutation
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT use `window.location.reload()` as a "fix"

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6
  - **Blocks**: Nothing
  - **Blocked By**: None

  **References**:
  - `.tickets/T073-toggle-mutation-stale-cache.md`
  - `packages/frontend/src/features/` — Feature modules with toggle mutations

  **Acceptance Criteria**:
  - [ ] Toggle mutations invalidate related caches
  - [ ] `cd packages/frontend && npx vitest run` passes

  **QA Scenarios**:
  ```
  Scenario: Toggle updates UI
    Tool: Bash
    Steps:
      1. Test: toggle endpoint → related list query invalidated
      2. `cd packages/frontend && npx vitest run` → pass
    Expected Result: Stale cache invalidated after toggle
    Evidence: .sisyphus/evidence/task-40-t073-stale-cache.txt
  ```

  **Commit**: YES
  - Message: `fix(T073): Invalidate cache on toggle mutations`
  - Files: `packages/frontend/src/features/`, test file
  - Pre-commit: `cd packages/frontend && npx vitest run`

---

## Wave 7 — More Quality + Docker Start

- [ ] 41. T074 — Fix query cache onError background refetch

  **What to do**:
  - Fix the onError handler in query cache that triggers background refetch
  - Ensure error state is properly shown without stale data appearing
  - Add test: verify error state renders correctly
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 7, independent
  **References**: `.tickets/T074-query-cache-onerror-background-refetch.md`, `packages/frontend/src/`
  **Commit**: YES — `fix(T074): Fix query cache onError background refetch`

- [ ] 42. T085 — Add concurrent guard to toggle endpoint

  **What to do**:
  - Add a concurrent request guard to prevent double-toggling endpoints
  - Disable toggle button while mutation is in-flight
  - Add test: verify rapid toggle clicks don't cause duplicate requests
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 7, independent
  **References**: `.tickets/T085-toggle-endpoint-no-concurrent-guard.md`, `packages/frontend/src/features/endpoints/`
  **Commit**: YES — `fix(T085): Add concurrent guard to endpoint toggle`

- [ ] 43. T084 — Add frozen-lockfile check to CI

  **What to do**:
  - Add `bun install --frozen-lockfile` check to CI pipeline (if one exists) or create a CI config
  - Document CI requirement in README
  - Ensure CI fails if lockfile is out of sync with package.json
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 7, independent
  **References**: `.tickets/T084-caret-ranges-no-lockfile-ci.md`, `package.json`, `bun.lock`
  **Commit**: YES — `fix(T084): Add frozen-lockfile enforcement to CI pipeline`

- [ ] 44. T043 — Pin Docker base image version

  **What to do**:
  - Replace `FROM bun:latest` with a specific version like `FROM bun:1.1.38-alpine` in the Dockerfile
  - Add test: verify Dockerfile uses pinned version
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 7, independent (Dockerfile, but before Wave 8 Docker changes)
  **References**: `.tickets/T043-unpinned-docker-base-image.md`, `Dockerfile`
  **Commit**: YES — `fix(T043): Pin Docker base image to specific version`

---

## Wave 8 — Docker Hardening (sequential — same Dockerfile)

- [ ] 44. T079 — Fix Dockerfile swallowing install errors

  **What to do**:
  - Remove `|| true` from install commands in Dockerfile
  - Let install errors fail the build
  - Add test: verify Dockerfile fails on install errors
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8, first (sequential in Dockerfile)
  **References**: `.tickets/T079-dockerfile-swallows-install-errors.md`, `Dockerfile`
  **Commit**: YES — `fix(T079): Remove || true from Dockerfile install commands`

- [ ] 45. T080 — Set NODE_ENV in Docker

  **What to do**:
  - Add `ENV NODE_ENV=production` to Dockerfile
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T080-node-env-not-set-docker.md`, `Dockerfile`
  **Commit**: YES — `fix(T080): Set NODE_ENV=production in Dockerfile`

- [ ] 46. T081 — Add .dockerignore

  **What to do**:
  - Create `.dockerignore` file excluding: node_modules, .git, .tickets, .sisyphus, tests, docs, *.md (except needed for build)
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T081-no-dockerignore.md`
  **Commit**: YES — `fix(T081): Add .dockerignore to reduce build context`

- [ ] 47. T082 — Add Docker logging configuration

  **What to do**:
  - Add logging configuration to docker-compose.yml
  - Configure max-size and max-file for container logs
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T082-no-docker-logging.md`, `docker-compose.yml`
  **Commit**: YES — `fix(T082): Add logging configuration to docker-compose`

- [ ] 48. T083 — Fix frontend package.json in Docker build

  **What to do**:
  - Fix the misconfigured frontend package.json that causes Docker build issues
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T083-frontend-pkg-json-misconfig.md`, `packages/frontend/package.json`, `Dockerfile`
  **Commit**: YES — `fix(T083): Fix frontend package.json for Docker build`

- [ ] 49. T076 — Add Docker healthcheck

  **What to do**:
  - Add HEALTHCHECK instruction to Dockerfile or docker-compose.yml
  - Use a simple HTTP check against the health endpoint
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T076-no-docker-healthcheck.md`, `Dockerfile`, `docker-compose.yml`
  **Commit**: YES — `fix(T076): Add Docker healthcheck`

- [ ] 50. T077 — Bind to specific interface, not 0.0.0.0

  **What to do**:
  - Change default server bind from 0.0.0.0 to 127.0.0.1 (or configurable via env)
  - Keep Docker binding on 0.0.0.0 (Docker network isolation)
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T077-port-bound-all-interfaces.md`, `packages/backend/src/server.ts`, `docker-compose.yml`
  **Commit**: YES — `fix(T077): Bind to localhost by default, keep Docker on 0.0.0.0`

- [ ] 51. T078 — Document encryption key env var usage

  **What to do**:
  - Add clear documentation about ENCRYPTION_KEY env var requirement
  - Fail at startup with clear error if ENCRYPTION_KEY is missing (instead of silent random key generation)
  - Add test: verify server fails to start without ENCRYPTION_KEY
  - Move ticket to done/

  **Recommended Agent Profile**: `quick`, Skills: []
  **Parallelization**: Wave 8
  **References**: `.tickets/T078-encryption-key-plain-env-var.md`, `packages/backend/src/core/auth/encryption.ts`
  **Commit**: YES — `fix(T078): Fail at startup without ENCRYPTION_KEY, add documentation`

---

## Wave 9 — Feature Requests

- [ ] 52. T086 — Add CommandCode adapter

  **What to do**:
  - Implement a new adapter for CommandCode (or similar) provider in `packages/backend/src/core/proxy/adapters/`
  - Register the adapter in the adapter registry
  - Add provider type to shared schema
  - Add tests: verify adapter formats requests correctly, handles responses
  - Move ticket to done/

  **Must NOT do**:
  - Do NOT modify existing adapters
  - Do NOT add real API credentials to tests — mock HTTP requests

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 9
  **References**: `.tickets/T086-commandcode-adapter.md`, `packages/backend/src/core/proxy/adapters/openai/adapter.ts` (pattern to follow), `packages/backend/src/core/proxy/registry.ts`

  **Acceptance Criteria**:
  - [ ] New adapter file created
  - [ ] Adapter registered in registry
  - [ ] `bun test packages/backend/` passes

  **QA Scenarios**:
  ```
  Scenario: CommandCode adapter works
    Tool: Bash
    Steps:
      1. Test: create provider with commandcode type → adapter selected correctly
      2. Test: format request → correct HTTP request shape
      3. `bun test packages/backend/` → pass
    Expected Result: New adapter functional
    Evidence: .sisyphus/evidence/task-52-t086-commandcode.txt
  ```

  **Commit**: YES
  - Message: `feat(T086): Add CommandCode adapter`
  - Files: New adapter file, `registry.ts`, schema file, test file
  - Pre-commit: `bun test packages/backend/`

- [ ] 53. T088 — Add password auth to admin UI (absorbs T038)

  **What to do**:
  - Add password-based authentication to the admin UI, replacing Bearer token auth for the admin panel
  - This ticket absorbs T038 (remove auth token from localStorage): use httpOnly cookies instead
  - Keep Bearer token auth for proxy endpoints (backward compatibility)
  - Add login page, session management with httpOnly cookies
  - Add tests: verify login flow, cookie security, session expiry
  - Move both T038 and T088 tickets to done/

  **Must NOT do**:
  - Do NOT remove proxy endpoint Bearer token auth
  - Do NOT store auth state in localStorage (httpOnly cookies only)
  - Do NOT use `as any` for cookie types

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**: Wave 9 (after all auth-related frontend tickets: T058, T059, T068, T069)
  **References**: `.tickets/T088-password-auth-admin-ui.md`, `.tickets/T038-auth-token-localstorage-xss.md`, `packages/frontend/src/features/auth/`, `packages/backend/src/core/auth/`

  **Acceptance Criteria**:
  - [ ] Password login for admin UI
  - [ ] httpOnly cookies for session management
  - [ ] No auth tokens in localStorage
  - [ ] `bun test packages/backend/` and `cd packages/frontend && npx vitest run` pass
  - [ ] T038 ticket also moved to done/

  **QA Scenarios**:
  ```
  Scenario: Password login works
    Tool: Bash
    Steps:
      1. Test: login with correct password → httpOnly cookie set
      2. Test: access admin route with valid cookie → allowed
      3. Test: access admin route without cookie → redirected to login
    Expected Result: Secure password auth flow
    Evidence: .sisyphus/evidence/task-53-t088-password-auth.txt

  Scenario: No tokens in localStorage
    Tool: Bash
    Steps:
      1. `grep -rn "localStorage" packages/frontend/src/features/auth/` → 0 hits
      2. `grep -rn "httpOnly" packages/backend/src/core/auth/` → found
    Expected Result: httpOnly cookies, no localStorage
    Evidence: .sisyphus/evidence/task-53-t088-no-localstorage.txt
  ```

  **Commit**: YES
  - Message: `feat(T088): Add password auth to admin UI with httpOnly cookies`
  - Files: `packages/frontend/src/features/auth/`, `packages/backend/src/core/auth/`, test files
  - Pre-commit: `bun test packages/backend/ && cd packages/frontend && npx vitest run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter + `bun test packages/backend/` + `npx vitest run packages/frontend/`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill if UI)
  Start from clean state. Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-ticket integration. Test edge cases: empty state, invalid input, rapid actions. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

All commits on a feature branch `fix/all-active-tickets`. Each commit format:

```
fix(ticket-id): Short description

- What was changed
- Test added/updated
- Ticket: T0XX

Closes #T0XX
```

For verification-only commits (T033, T035, T087):
```
chore(T0XX): Verify already-fixed, move ticket to done

- Issue already resolved in commit ABC1234
- Ticket moved from .tickets/ to .tickets/done/

Closes #T0XX
```

**Pre-commit hook**: Run backend tests (`bun test packages/backend/`) + frontend tests (`cd packages/frontend && npx vitest run`) before every commit. If tests fail, do NOT commit.

---

## Success Criteria

### Verification Commands
```bash
bun test packages/backend/          # Expected: All tests pass
cd packages/frontend && npx vitest run  # Expected: All tests pass
ls .tickets/ | grep -v done         # Expected: No active tickets remain
git log --oneline | grep "fix(T0"   # Expected: 52 fix commits
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All backend tests pass (`bun test packages/backend/`)
- [ ] All frontend tests pass (`cd packages/frontend && npx vitest run`)
- [ ] All 52 ticket files moved to `.tickets/done/`
- [ ] Each ticket has exactly one commit
- [ ] No regressions in existing functionality
