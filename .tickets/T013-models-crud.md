# T013: Models CRUD API

## Phase: 2 — Proxy Core
## Depends on: T003, T009
## Estimated effort: M

## Description

Implement the models tRPC router for both real and virtual models. Virtual models include fallback chains and tuned variants.

## Acceptance Criteria

- [ ] `models.createReal({ providerId, id, providerModel, displayName? })`:
  - [ ] Validates provider exists
  - [ ] Creates real model
- [ ] `models.createVirtualFallback({ id, fallbackChain, displayName? })`:
  - [ ] Validates all model IDs in chain exist
  - [ ] Validates no circular dependencies
  - [ ] Creates virtual fallback model
- [ ] `models.createVirtualTuned({ id, baseModelId, overrides, displayName? })`:
  - [ ] Validates base model exists and is a real model (or another tuned model)
  - [ ] Creates virtual tuned model
- [ ] `models.list()` → all models (real + virtual)
- [ ] `models.get({ id })` → single model with full details
- [ ] `models.update({ id, ...fields })`:
  - [ ] For real: update providerModel, displayName
  - [ ] For virtual fallback: update fallbackChain (re-validates)
  - [ ] For virtual tuned: update overrides, baseModelId
- [ ] `models.delete({ id })`:
  - [ ] Checks no other virtual models reference this as base/fallback
  - [ ] If referenced → error with list of dependents
  - [ ] Otherwise deletes + removes from endpoint_models
- [ ] `models.testResolution({ id })`:
  - [ ] Dry-run of model resolution
  - [ ] Returns resolved chain: `[{ modelId, providerId, providerModel, adapterType }]`
- [ ] Test: create/list/update/delete for all three model types
- [ ] Test: circular dependency detection on create/update
- [ ] Test: delete with dependents fails
- [ ] Test: testResolution traces full chain
- [ ] Test: invalid baseModelId fails
- [ ] Test: invalid fallback chain model IDs fail

## Implementation Notes

- Circular dependency check: walk the chain graph, detect cycles
- The `id` field is user-chosen (not UUID) — it's the model name used in requests
- Delegate resolution logic to `ModelResolver` from T007
