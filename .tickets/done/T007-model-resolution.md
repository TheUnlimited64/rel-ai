# T007: Model Resolution Engine

## Phase: 2 — Proxy Core
## Depends on: T002, T004
## Estimated effort: L

## Description

Implement model resolution logic: given a requested model ID, resolve to a concrete provider + provider model + overrides. Handle real models, fallback chains, and tuned variants. Supports health-check-aware fallback.

## Acceptance Criteria

- [ ] `ModelResolver` class with method `resolve(modelId: string)`:
  - [ ] Real model → returns `{ providerId, providerModel, overrides }`
  - [ ] Virtual tuned → resolves base model, merges overrides
  - [ ] Virtual fallback → tries chain in order, skips unhealthy providers
- [ ] `resolve` returns `ResolvedModel` type: `{ providerId, providerModel, overrides, adapterType }`
- [ ] Fallback chain handling:
  - [ ] Iterates chain in declared order
  - [ ] Skips providers marked unhealthy (tracked per-provider)
  - [ ] If all providers unhealthy in chain → throws `AllProvidersFailedError`
  - [ ] Does NOT retry same provider in single resolution
- [ ] Override merging: tuned model overrides deep-merge with base model overrides
- [ ] Circular dependency detection in fallback chains → throws `CircularDependencyError`
- [ ] Missing model ID → throws `ModelNotFoundError`
- [ ] Missing provider → throws `ProviderNotFoundError`
- [ ] Provider health tracking:
  - [ ] `markUnhealthy(providerId, durationMs)` — temp mark
  - [ ] `isHealthy(providerId)` → `boolean` — respects expiry
  - [ ] Default unhealthy duration: 60s
- [ ] Test: resolve real model
- [ ] Test: resolve tuned virtual model (overrides merged)
- [ ] Test: resolve fallback chain (first healthy chosen)
- [ ] Test: fallback skips unhealthy providers
- [ ] Test: circular fallback detection
- [ ] Test: missing model throws
- [ ] Test: missing provider throws
- [ ] Test: all providers unhealthy throws

## Implementation Notes

- Resolver is stateless except for health tracking
- Health tracking is in-memory only (resets on restart — acceptable for homelab)
- No DB access in resolver — receives model/provider data via constructor or method params
- Keep in `packages/backend/src/core/model/`
