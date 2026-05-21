# T005: OpenAI-Compatible Adapter

## Phase: 2 — Proxy Core
## Depends on: T004
## Estimated effort: M

## Description

Implement the OpenAI-compatible provider adapter. Handles request formatting and SSE parsing for any OpenAI-compatible API (OpenAI, DeepSeek, OpenRouter, etc.).

## Acceptance Criteria

- [ ] Implements `ProviderAdapter` interface, `type: "openai"`
- [ ] `createRequest` builds correct OpenAI chat completion request format:
  - [ ] URL: `{baseUrl}/chat/completions`
  - [ ] Headers: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`
  - [ ] Body: `{ model, messages, stream, ...overrides }`
- [ ] `parseSSEChunk` handles OpenAI SSE format:
  - [ ] Parses `data: {json}` lines
  - [ ] Extracts `choices[0].delta.content` for content
  - [ ] Extracts `choices[0].delta.reasoning_content` for thinking (DeepSeek format)
  - [ ] Handles `data: [DONE]` as stream end
  - [ ] Extracts `usage` from final chunk
  - [ ] Returns `null` for empty/keepalive chunks
- [ ] `parseError` extracts OpenAI error format: `{ error: { message, type, code } }`
- [ ] `isRateLimitError` detects HTTP 429 and rate-limit error codes
- [ ] Test: createRequest with various param combinations
- [ ] Test: parseSSEChunk with realistic OpenAI SSE chunks
- [ ] Test: parseSSEChunk with DeepSeek thinking chunks
- [ ] Test: parseError with error response
- [ ] Test: isRateLimitError true/false cases
- [ ] Handles multi-line SSE chunks (single `parseSSEChunk` call with multiple `data:` lines)

## Implementation Notes

- This covers: OpenAI, DeepSeek, OpenRouter, Together, Groq — all OpenAI-compatible
- The `overrides` field in `createRequest` merges into request body — allows `temperature`, `max_tokens`, `thinking_effort` etc.
- DeepSeek uses `reasoning_content` field for thinking — extract it
