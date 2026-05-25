# T092: Remove or Rewrite Smelly/Low-Value Tests

## Phase: 5 — Quality
## Depends on: None
## Estimated effort: M

## Description

9 test files provide negative or near-zero value. They either test framework/library internals instead of app logic, mock everything so the test only verifies the mock returns what the mock was told to return, or rely on inherently flaky timing assertions. These tests erode trust in the suite, waste CI time, and mask real gaps.

### Smelly Tests Inventory

| # | File | Smell | Action |
|---|------|-------|--------|
| 1 | `packages/shared/schemas/__tests__/enums.test.ts` | Tests `z.enum()` Zod built-in, not app logic | **Delete** — Zod tests its own enums |
| 2 | `packages/frontend/src/features/providers/__tests__/useProviders.test.tsx` | Mocks `trpc.useQuery`, asserts mock returns mock data | **Rewrite** — test hook with MSW or integration |
| 3 | `packages/frontend/src/features/endpoints/__tests__/useEndpoints.test.tsx` | Same as #2, trivial mock passthrough | **Rewrite** — test hook with MSW or integration |
| 4 | `packages/frontend/src/features/auth/__tests__/TokenRevealDialog.test.tsx` | Static render only, no interaction, no visibility toggle | **Expand** — test click-to-reveal, masked/shown states |
| 5 | `packages/frontend/src/features/auth/__tests__/TokenTable.test.tsx` | Trivial render checks, no interaction, no mask/display logic | **Expand** — test masked token display, copy action, delete |
| 6 | `packages/frontend/src/features/auth/__tests__/auth.test.tsx` | Fragile `globalThis.fetch` mocking, breaks on fetch impl changes | **Rewrite** — use MSW for network mocking |
| 7 | `packages/backend/tests/db/schema.test.ts` | Tests Drizzle ORM table definitions, not app code | **Delete** — Drizzle tests its own schema builder |
| 8 | `packages/backend/tests/core/provider/service.test.ts` | Only tests `regenerateApiKey`, misses `maskApiKey` / `isEncryptedKey` | **Expand** — add tests for `maskApiKey`, `isEncryptedKey` |
| 9 | `packages/backend/tests/core/proxy/proxy-handler-timing.test.ts` | Timing assertions (`setTimeout` ms) inherently flaky under load | **Rewrite** — use fake timers or assertion ranges, not exact ms |

## Acceptance Criteria

- [ ] `enums.test.ts` deleted with justification comment in PR
- [ ] `db/schema.test.ts` deleted with justification comment in PR
- [ ] `useProviders.test.tsx` rewritten to test actual data flow (MSW or tRPC integration helpers)
- [ ] `useEndpoints.test.tsx` rewritten same as above
- [ ] `TokenRevealDialog.test.tsx` expanded: click-to-reveal, masked/shown states, keyboard accessibility
- [ ] `TokenTable.test.tsx` expanded: masked tokens, copy-to-clipboard, delete confirmation
- [ ] `auth.test.tsx` rewritten with MSW instead of `globalThis.fetch` monkey-patching
- [ ] `provider/service.test.ts` expanded with `maskApiKey` + `isEncryptedKey` test cases
- [ ] `proxy-handler-timing.test.ts` rewritten with `vi.useFakeTimers()` or range-based assertions
- [ ] All rewritten/expanded tests pass: `bun run test`
- [ ] No test removed without replacement or explicit justification

## Implementation Notes

- **MSW** (Mock Service Worker) is the recommended approach for frontend hook tests. See `packages/frontend/` for existing MSW setup if any.
- For tRPC hook testing, consider `@trpc/testing` or render-hook pattern with `trpc.createClient()`.
- `vi.useFakeTimers()` + `vi.advanceTimersByTime()` for timing tests — eliminates CI flake.
- When deleting tests (#1, #7), confirm no code coverage requirement depends on them. If there is a coverage gate, replacement tests must be added first.
