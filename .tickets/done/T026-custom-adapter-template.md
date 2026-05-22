# T026: Custom Adapter Template & Documentation

## Phase: 4 — Polish
## Depends on: T004, T005, T006
## Estimated effort: M

## Description

Create a custom adapter template and guide so new provider adapters can be added easily.

## Acceptance Criteria

- [ ] Custom adapter template file: `packages/backend/src/adapters/custom/template.ts`
  - [ ] Skeleton implementing `ProviderAdapter` interface
  - [ ] Comments explaining each method
  - [ ] TypeScript compiles (all methods return stubs)
- [ ] Adapter registration guide:
  - [ ] How to implement each method
  - [ ] How to register the adapter
  - [ ] How to test the adapter
  - [ ] SSE format parsing guide
- [ ] Example custom adapter: a passthrough adapter that forwards requests as-is (useful for already-OpenAI-compatible endpoints that need no transformation)
- [ ] Test: custom adapter template compiles
- [ ] Test: passthrough adapter works with ProxyHandler

## Implementation Notes

- This is documentation + template, not a runtime feature
- The adapter system was designed for this from T004 — this ticket validates that the design works by adding a new adapter without modifying core code
