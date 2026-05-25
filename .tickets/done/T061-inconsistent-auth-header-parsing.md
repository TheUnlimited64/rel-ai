# T061: Inconsistent Auth Header Parsing Between Proxy and tRPC

## Phase: 5 — Quality
## Depends on: T010, T014
## Estimated effort: XS

## Description

`routes/proxy.ts:49-50` validates `parts.length !== 2`. `api/context.ts:24` destructures `split(" ")`, silently accepts `"Bearer  token"` (double space → empty token caught by `!token`). Different strictness levels.

## Acceptance Criteria

- [ ] Extract shared auth header parser utility
- [ ] Both proxy and tRPC use same parsing logic
- [ ] Handle edge cases: double spaces, missing Bearer prefix, empty token

## Implementation Notes

- Single function: `parseBearerToken(header: string | undefined): string | null`
