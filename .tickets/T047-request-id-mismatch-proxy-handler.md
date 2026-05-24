# T047: Request ID Mismatch Between Proxy Header and Handler Body

## Phase: 5 — Quality
## Depends on: T014, T008
## Estimated effort: S

## Description

Proxy route (`routes/proxy.ts:132`) generates `requestId` via `crypto.randomUUID()`. Handler (`core/proxy/handler.ts:55`) generates `id` via `generateId()`. The `X-Request-Id` response header uses one ID, the response body uses the other. Impossible to correlate logs, headers, and body for a single request.

## Acceptance Criteria

- [ ] Pass `requestId` from proxy route into handler
- [ ] Use same ID in `X-Request-Id` header and response body
- [ ] Log messages use same ID
- [ ] Test: header and body IDs match for a single request

## Implementation Notes

- Handler constructor or `handleRequest` accepts optional `requestId` parameter
- If not provided, fall back to `generateId()`
