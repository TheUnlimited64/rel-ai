# T008: SSE Proxy Handler

## Phase: 2 — Proxy Core
## Depends on: T004, T005, T006, T007
## Estimated effort: L

## Description

Implement the core proxy handler: accepts an OpenAI-compatible request, resolves the model, gets the adapter, sends the request to the provider, and streams the response back via SSE. Also handles non-streaming requests.

## Acceptance Criteria

- [ ] `ProxyHandler` class with method `handle(request: ProxyRequest)`:
  - [ ] Resolves model via `ModelResolver`
  - [ ] Gets adapter from `AdapterRegistry`
  - [ ] Builds provider request via `adapter.createRequest()`
  - [ ] Sends request to provider
  - [ ] For streaming: returns `ReadableStream` of SSE events in OpenAI format
  - [ ] For non-streaming: returns complete response in OpenAI format
- [ ] SSE output format is always OpenAI-compatible regardless of upstream provider
  - [ ] Output chunks: `data: {"id":"...","object":"chat.completion.chunk","choices":[{"delta":{"content":"..."}}]}\n\n`
  - [ ] Stream end: `data: [DONE]\n\n`
- [ ] Provider response normalization:
  - [ ] Anthropic responses converted to OpenAI format
  - [ ] Uses `adapter.parseSSEChunk()` for provider-specific parsing
  - [ ] Re-encodes as OpenAI SSE format
- [ ] Error handling:
  - [ ] Provider rate limit → attempts next in fallback chain (before streaming starts)
  - [ ] Provider error → returns OpenAI-compatible error response
  - [ ] Network error → returns 502 with error detail
  - [ ] Model not found → 404
- [ ] Request logging: emits log event with timing, tokens, status
- [ ] Timeout: configurable, default 120s
- [ ] Test: streaming proxy end-to-end (mock provider)
- [ ] Test: non-streaming proxy
- [ ] Test: rate limit triggers fallback
- [ ] Test: all providers fail → appropriate error
- [ ] Test: timeout → 504 error
- [ ] Test: output is valid OpenAI SSE format
- [ ] Test: Anthropic → OpenAI format conversion

## Implementation Notes

- This is the core request path — keep it clean and testable
- Use Fetch API for HTTP client (Bun native)
- SSE parsing: split on `\n\n`, parse `data:` lines
- Must normalize ALL provider formats to OpenAI output format
- Keep in `packages/backend/src/core/proxy/`
