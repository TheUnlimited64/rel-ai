# T070: Anthropic Adapter x-api-key Undefined When No Overrides

## Phase: 2 — Proxy Core
## Depends on: T006
## Estimated effort: XS

## Description

`adapters/anthropic/adapter.ts:41` — `"x-api-key": overrides?.apiKey as string` sends `undefined` as header value when `overrides` missing or `apiKey` absent. Serializes as header absent or `"undefined"`. No fallback, no guard.

## Acceptance Criteria

- [ ] Validate `apiKey` exists before making request
- [ ] Throw descriptive error if missing: "Anthropic API key required"
- [ ] Test: missing apiKey → clear error, not undefined header

## Implementation Notes

- Check at adapter entry point, not at fetch call
- Similar validation needed in OpenAI adapter
