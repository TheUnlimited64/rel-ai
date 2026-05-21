# T014: Proxy Route Handler (Hono)

## Phase: 2 — Proxy Core
## Depends on: T008, T009, T010
## Estimated effort: M

## Description

Wire the SSE proxy handler (T008) into Hono routes. Set up the OpenAI-compatible proxy endpoints that accept requests and stream responses.

## Acceptance Criteria

- [ ] Hono routes registered:
  - [ ] `POST /v1/:endpointPath/chat/completions` — proxy chat completion
  - [ ] `GET /v1/:endpointPath/models` — list endpoint's available models
- [ ] Route middleware:
  - [ ] Validates endpoint path exists and is enabled
  - [ ] Validates bearer token for endpoint
  - [ ] Attaches endpoint config to request context
- [ ] Request validation:
  - [ ] Validates OpenAI-compatible request body shape with Zod
  - [ ] `model` field required
  - [ ] `messages` field required, non-empty array
  - [ ] `stream` field optional (defaults to true)
- [ ] Response headers set correctly:
  - [ ] `Content-Type: text/event-stream` for streaming
  - [ ] `Content-Type: application/json` for non-streaming
  - [ ] `X-Request-Id` for tracing
- [ ] Returns OpenAI-compatible errors for:
  - [ ] 401 — invalid/missing token
  - [ ] 404 — endpoint or model not found
  - [ ] 502 — upstream provider error
  - [ ] 504 — timeout
- [ ] Test: valid streaming request → SSE response
- [ ] Test: valid non-streaming request → JSON response
- [ ] Test: invalid token → 401
- [ ] Test: unknown endpoint → 404
- [ ] Test: unknown model → 404
- [ ] Test: request body validation errors

## Implementation Notes

- This is the HTTP layer — keep thin, delegate to ProxyHandler
- OpenAI error format: `{ "error": { "message": "...", "type": "...", "code": "..." } }`
- Models list endpoint returns OpenAI `/v1/models` format
