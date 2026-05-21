# T002: Shared Package — Zod Schemas

## Phase: 1 — Foundation
## Depends on: T001
## Estimated effort: M

## Description

Create all shared Zod schemas in `packages/shared`. These are the single source of truth for data shapes used by both backend and frontend. Every type is derived from a Zod schema — no standalone TypeScript interfaces.

## Acceptance Criteria

- [ ] `ProviderSchema` with fields: id, name, adapterType (enum), baseUrl, apiKey, enabled, config, createdAt, updatedAt
- [ ] `EndpointSchema` with fields: id, name, path, token, models, enabled, createdAt, updatedAt
- [ ] `RealModelSchema` with fields: id, providerId, providerModel, type ("real")
- [ ] `VirtualModelSchema` with fields: id, type ("virtual"), variant ("fallback"|"tuned"), fallbackChain, baseModelId, overrides
- [ ] `ModelSchema` = discriminated union of RealModelSchema | VirtualModelSchema on `type` field
- [ ] `RequestLogSchema` with fields: id, endpointId, requestedModel, resolvedModel, providerId, promptTokens, completionTokens, latencyMs, status, errorDetail, createdAt
- [ ] `AuthTokenSchema` with fields: id, name, tokenHash, createdAt, lastUsedAt
- [ ] All schemas export inferred types via `z.infer<typeof XSchema>`
- [ ] All schemas export `CreateXSchema` variants (without id, timestamps) for input validation
- [ ] No `any` types
- [ ] All schemas have unit tests validating: valid input passes, invalid input fails with specific error paths
- [ ] `AdapterTypeSchema` enum: "openai" | "anthropic" | "custom"
- [ ] `ModelStatusSchema` enum: "success" | "error" | "rate_limited"

## Implementation Notes

- Use `z.discriminatedUnion` for ModelSchema
- Use `z.enum` for all enum fields
- Use `z.brand` or nominal typing for IDs if desired
- Export barrel from `packages/shared/src/index.ts`
