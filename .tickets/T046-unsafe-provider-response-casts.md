# T046: Unsafe `as ProviderResponse` Type Assertions

## Phase: 5 — Security Hardening
## Depends on: T018
## Estimated effort: S

## Description

Multiple `as ProviderResponse` casts force types that may differ from actual tRPC output:
- `providers/hooks/useProviders.ts:11` — mutation return may not match `ProviderResponse`
- `providers/hooks/useProviders.ts:27` — forces `ProviderResponse[]` on query data
- `providers/detail.tsx:25` — `query.data as ProviderResponse | undefined`

If backend masks `apiKey` server-side but type expects raw, shape mismatch at runtime.

## Acceptance Criteria

- [ ] Remove all `as ProviderResponse` casts in providers module
- [ ] Use tRPC inferred output types: `inferRouterOutputs<AppRouter>["providers"]["list"][number]`
- [ ] Fix router output types if they don't match frontend expectations
- [ ] Test: type errors surface at compile time, not runtime

## Implementation Notes

- Pattern from logs/api.ts: use `inferRouterOutputs` for correct types
- If tRPC output type is complex, create utility type in shared package
