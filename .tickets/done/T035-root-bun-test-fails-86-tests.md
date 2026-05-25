# T035: Root `bun test` Fails (86 Tests) — Missing Root `test` Script + Backend Bugs

## Phase: Bugfix
## Depends on: None
## Estimated effort: S

## Description

Running `bun test` from root fails 86 tests + 8 errors. Root cause splits into two independent issues:

1. **Wrong test runner for frontend**: `bun test` uses Bun's native test runner, which lacks DOM (`jsdom`). Frontend `.test.tsx` files require Vitest. Playwright E2E `*.spec.ts` files also picked up incorrectly. Root `package.json` has no `"test"` script.
2. **Two real backend bugs** causing 12 test failures: `mapNotFound()` in tRPC routers changes error message, and `maskApiKey()` uses wrong format.

## Root Cause

### Issue A: Missing root `"test"` script

Root `package.json` (line 1-20) has no `"test"` script. `bun test` with no config falls back to Bun's built-in test runner, which globs `**/*.test.{js,jsx,ts,tsx}` across all workspace packages. Frontend tests need `vitest` with `jsdom` environment (configured in `packages/frontend/vitest.config.ts`). Playwright `*.spec.ts` files are also incompatible.

Breakdown of 86 fails + 8 errors when running `bun test` from root:

| Category | Count | Reason |
|----------|-------|--------|
| Frontend React tests | 74 fail | `ReferenceError: document is not defined` — no jsdom |
| Playwright E2E tests | 7 errors | `test.describe()` not expected by Bun runner |
| Backend tests | 12 fail + 1 error | Real code bugs (see below) |

### Issue B: Backend bugs (root cause detail)

#### Bug 1: `mapNotFound()` masks `"NOT_FOUND"` error message (8 tests fail)

Both `endpoints.ts:14-23` and `providers.ts:45-54` define `mapNotFound()`:

```ts
async function mapNotFound<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      throw new TRPCError({ code: "NOT_FOUND", message: "Endpoint not found" });
      //                                                       ^^^^^^^^^^^^^^^^^^^^
      //                                                       Tests check for "NOT_FOUND"
    }
    throw e;
  }
}
```

Service layer throws `new Error("NOT_FOUND")` on missing entities. `mapNotFound()` wraps it in a `TRPCError` with message `"Endpoint not found"` / `"Provider not found"`. Tests do `.rejects.toThrow("NOT_FOUND")` which checks `error.message` — no longer matches.

**Affected tests**: `endpoints.test.ts` lines 279, 286, 291, 296, 320 (5 tests) + `providers.test.ts` lines 208, 215, 220 (3 tests)

#### Bug 2: `maskApiKey()` uses `...last4` format instead of `****` (3 tests fail)

`core/provider/service.ts:39-47`:
```ts
export async function maskApiKey(encryptedKey: string): Promise<string> {
  const decrypted = await decrypt(encryptedKey);
  if (decrypted.length <= 3) return "****";
  return `${decrypted.slice(0, 3)}...${decrypted.slice(-4)}`;
  //      returns: "sk-...c123" — not "sk-****"
}
```

Tests expect `"sk-****"` (first 3 chars + `****`). Code returns `"sk-...c123"` (first 3 + `...` + last 4).

**Affected tests**: `providers.test.ts` lines 58, 137, 165

## Acceptance Criteria

- [ ] Root `"test"` script added to root `package.json` that runs backend tests via `bun test`, shared tests via `bun test`, and frontend tests via `vitest run`
- [ ] Running `bun test` from root produces warning or delegates properly instead of failing
- [ ] `bun run --filter @rel-ai/frontend test` (vitest) passes all frontend tests
- [ ] All 12 backend test failures fixed
- [ ] No regressions in backend test suite (all 217 backend tests pass)

## Implementation Notes

### Step 1: Add root `"test"` script

```json
"test": "bun test packages/backend/tests/ && bun test packages/shared/src/ && bun run --filter @rel-ai/frontend test"
```

### Step 2: Fix `mapNotFound()` — option A (keep human-readable message, fix tests)

Change tests to match current human-readable messages:
```ts
// endpoints.test.ts
.rejects.toThrow("Endpoint not found")
// providers.test.ts
.rejects.toThrow("Provider not found")
```

Or option B (keep `"NOT_FOUND"` in message):
```ts
throw new TRPCError({ code: "NOT_FOUND", message: "NOT_FOUND" });
```

### Step 3: Fix `maskApiKey()`

Change return to match test expectation:
```ts
return `${decrypted.slice(0, 3)}****`;
```

## Files

- `package.json:7-10` — missing `"test"` script
- `packages/backend/src/api/routers/endpoints.ts:14-23` — `mapNotFound()` message mismatch
- `packages/backend/src/api/routers/providers.ts:45-54` — `mapNotFound()` message mismatch
- `packages/backend/src/core/provider/service.ts:43` — `maskApiKey()` format mismatch
- `packages/backend/tests/api/endpoints.test.ts:279-321` — tests expecting `"NOT_FOUND"`
- `packages/backend/tests/api/providers.test.ts:55-220` — tests expecting `"NOT_FOUND"` and `"sk-****"`
