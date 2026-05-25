# T096: Replace Frontend Mock-Heavy Hook/Component Tests with Integration Tests

## Phase: 5 — Quality
## Depends on: T017, T009
## Estimated effort: M

## Description

Several frontend tests use `vi.mock()` at the module level to stub tRPC hooks, then assert the mock returns exactly what was set up. These tests verify the mocking library, not the app. They pass even if the real hook/component is completely broken. Meanwhile, the auth module uses `globalThis.fetch` monkey-patching which is fragile and breaks when fetch internals change.

This ticket focuses on establishing a proper test infrastructure pattern (MSW + tRPC test helpers) and applying it to the worst offenders. T095 covers new test creation; this ticket covers fixing the broken testing approach.

### Files to Rewrite

| # | File | Current Smell | Target Pattern |
|---|------|---------------|----------------|
| 1 | `features/providers/__tests__/useProviders.test.tsx` | `vi.mock()` tRPC, assert mock data | MSW handler for `providers.list`, render hook, assert real data flow |
| 2 | `features/endpoints/__tests__/useEndpoints.test.tsx` | Same as #1 | MSW handler for `endpoints.list`, render hook, assert real data flow |
| 3 | `features/providers/__tests__/useProvider.test.tsx` | Same mock pattern | MSW handler for `providers.get`, test single provider fetch |
| 4 | `features/providers/__tests__/useCreateProvider.test.tsx` | Mock mutation, assert called | MSW handler for `providers.create`, test real mutation + cache update |
| 5 | `features/endpoints/__tests__/useCreateEndpoint.test.tsx` | Same as #4 | MSW handler for `endpoints.create` |
| 6 | `features/auth/__tests__/auth.test.tsx` | `globalThis.fetch` monkey-patch | MSW handler for auth endpoints |

## Acceptance Criteria

- [ ] MSW setup established in `packages/frontend/src/test/msw/` (or equivalent) with:
  - [ ] tRPC response wrapper utility (matches actual tRPC response shape)
  - [ ] Common handlers for all tRPC routes used in tests
  - [ ] `setupServer` configured in test setup file
- [ ] tRPC test wrapper utility: `createTestWrapper()` that provides `QueryClient` + tRPC context
- [ ] All 6 files rewritten using MSW + real tRPC hooks
- [ ] Tests verify: loading states, success data, error states, retry behavior
- [ ] Tests verify: mutation invalidates relevant query cache (optmistic update if applicable)
- [ ] No `vi.mock()` calls for tRPC hooks in rewritten files
- [ ] No `globalThis.fetch` monkey-patching in rewritten files
- [ ] All rewritten tests pass: `bun run test --filter frontend`

## Implementation Notes

- **MSW for tRPC**: tRPC over HTTP uses POST to `/trpc/...` with JSON bodies. MSW handlers need to match these URLs and return tRPC-shaped responses (`{ result: { data: ... } }`).
- **tRPC response shape**: Inspect a real network request in dev tools to get exact shape. It's not just JSON — tRPC wraps responses.
- **Test wrapper pattern**:
  ```tsx
  function createTestWrapper() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {children}
          </trpc.Provider>
        </QueryClientProvider>
      );
    };
  }
  ```
- **Hook rendering**: Use `renderHook` from `@testing-library/react` with the wrapper above.
- **Existing MSW**: Check if MSW is already configured in the project — look for `mockServiceWorker.js` or `msw` in `package.json`.
