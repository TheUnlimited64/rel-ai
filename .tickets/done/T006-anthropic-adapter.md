# T006: Anthropic Adapter

## Phase: 2 — Proxy Core
## Depends on: T004
## Estimated effort: M

## Description

Implement the Anthropic provider adapter. Handles Anthropic's distinct request/response format and SSE streaming protocol.

## Acceptance Criteria

- [ ] Implements `ProviderAdapter` interface, `type: "anthropic"`
- [ ] `createRequest` builds Anthropic message format:
  - [ ] URL: `{baseUrl}/v1/messages`
  - [ ] Headers: `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`
  - [ ] Body: `{ model, messages, max_tokens, stream, ...overrides }`
  - [ ] Converts OpenAI-style `messages` to Anthropic format (system message → `system` field)
- [ ] `parseSSEChunk` handles Anthropic SSE format:
  - [ ] Parses `event: message_start`, `content_block_delta`, `message_delta` event types
  - [ ] Extracts `text` delta from `content_block_delta` with `type: "text_delta"`
  - [ ] Extracts `thinking` delta from `content_block_delta` with `type: "thinking_delta"`
  - [ ] Handles `message_delta` for stop reason and usage
  - [ ] Extracts usage from `message_start` and `message_delta`
- [ ] `parseError` extracts Anthropic error format: `{ type: "error", error: { type, message } }`
- [ ] `isRateLimitError` detects HTTP 429 and `rate_limit_error` type
- [ ] Test: createRequest converts OpenAI messages to Anthropic format
- [ ] Test: parseSSEChunk with realistic Anthropic SSE stream
- [ ] Test: parseError with error response
- [ ] Test: isRateLimitError true/false cases
- [ ] Test: system message extraction from message array

## Implementation Notes

- Anthropic has very different request/response shapes from OpenAI — this adapter does the translation
- The model resolution layer sends messages in OpenAI format; adapters handle conversion
- `max_tokens` required in Anthropic API — default to 4096 if not in overrides
- Extended thinking support via `thinking` param in overrides
