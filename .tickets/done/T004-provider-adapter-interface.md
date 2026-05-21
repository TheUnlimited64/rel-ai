# T004: Provider Adapter Interface

## Phase: 1 — Foundation
## Depends on: T001, T002
## Estimated effort: M

## Description

Define the `ProviderAdapter` interface and adapter registry. This is the core abstraction that makes provider adapters pluggable. Must be framework-agnostic (no HTTP framework deps).

## Acceptance Criteria

- [ ] `ProviderAdapter` interface defined with methods:
  - [ ] `type: string` — adapter identifier
  - [ ] `createRequest(params)` → `{ url, headers, body }` — build provider HTTP request
  - [ ] `parseSSEChunk(chunk: string)` → `ParsedChunk | null` — parse provider SSE format
  - [ ] `parseError(response)` → `ProviderError` — normalize provider error
  - [ ] `isRateLimitError(error)` → `boolean` — detect rate limits
- [ ] `ParsedChunk` type: `{ content?: string; thinking?: string; done: boolean; usage?: TokenUsage }`
- [ ] `ProviderError` type: `{ code: string; message: string; status: number; retryable: boolean }`
- [ ] `TokenUsage` type: `{ promptTokens: number; completionTokens: number }`
- [ ] `AdapterRegistry` class:
  - [ ] `register(adapter: ProviderAdapter)` — register adapter by type
  - [ ] `get(type: string)` → `ProviderAdapter` — lookup
  - [ ] `has(type: string)` → `boolean`
  - [ ] Throws on unknown type access
- [ ] Test: register + retrieve adapter
- [ ] Test: registry throws on unknown type
- [ ] Test: can register multiple adapter types
- [ ] No HTTP framework dependencies in this module

## Implementation Notes

- This is pure type/interface work + simple registry map
- Adapters are stateless — all context passed via params
- Keep in `packages/backend/src/core/provider/`
