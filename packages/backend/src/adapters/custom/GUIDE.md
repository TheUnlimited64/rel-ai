# Custom Adapter Guide

This guide explains how to create a custom provider adapter for rel-ai.

## Overview

A **provider adapter** translates between rel-ai's unified interface and a
specific LLM provider's API. The `ProviderAdapter` interface has four methods:

| Method              | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `createRequest`    | Build the HTTP request sent to the provider      |
| `parseSSEChunk`    | Parse a streaming SSE chunk from the provider     |
| `parseError`       | Parse an error response into a standard shape     |
| `isRateLimitError` | Detect rate-limit errors for retry logic          |

## Quick Start

1. Copy `template.ts` to a new file (e.g. `myprovider.ts`) inside
   `packages/backend/src/adapters/custom/`.
2. Rename the class (e.g. `MyProviderAdapter`).
3. Set `readonly type` to your adapter's identifier (must match the
   `AdapterTypeSchema` enum in the shared package).
   **Important**: Each adapter type must be unique. Registering a duplicate
   type will throw an error at startup.
4. Implement each method (see below).
5. Re-export from `index.ts`.
6. Register in `server.ts`:
   ```ts
   import { MyProviderAdapter } from "./adapters/custom/index.js";
   registry.register(new MyProviderAdapter());
   ```

## Method Contracts

### `createRequest(params) → { url, headers, body }`

Build the HTTP request for the provider's chat endpoint.

- **`params.model`** — Provider model identifier (e.g. `"gpt-4"`, `"claude-3-sonnet"`).
- **`params.messages`** — Conversation in unified `Message[]` format (`{ role, content }`).
- **`params.stream`** — Whether the client requested streaming.
- **`params.overrides`** — Arbitrary key/value pairs from the provider config. Always
  contains `apiKey` and `baseUrl`. Other keys are forwarded to the body.

**Return:**

```ts
{
  url: string;            // Full endpoint URL
  headers: Record<string, string>;  // HTTP headers (Authorization, Content-Type, etc.)
  body: unknown;          // JSON body — must include model, messages, stream at minimum
}
```

**Important**: Strip internal keys (`apiKey`, `baseUrl`) from `overrides` before
merging into the body. The provider should never receive these.

### `parseSSEChunk(chunk: string) → ParsedChunk | null`

Parse a **single** SSE chunk (may contain multiple `data:` lines).

**Return `ParsedChunk`:**

```ts
{
  content?: string;       // Text content accumulated in this chunk
  thinking?: string;       // Reasoning/thinking content
  done: boolean;           // true when stream is complete
  usage?: TokenUsage;      // { promptTokens, completionTokens }
}
```

Return `null` for keepalive lines or unparseable data.

### `parseError(response: Response) → Promise<ProviderError>`

Parse a non-2xx response into a standard error shape.

```ts
{
  code: string;       // Machine-readable error code
  message: string;    // Human-readable message
  status: number;     // HTTP status code
  retryable: boolean;  // true for 5xx and 429
}
```

### `isRateLimitError(error: ProviderError) → boolean`

Return `true` if the error represents a rate-limit condition. The proxy handler
uses this to decide whether to retry with a fallback model.

## SSE Format Reference

### OpenAI Format

```
data: {"id":"chatcmpl-123","choices":[{"delta":{"content":"Hi"}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{"reasoning_content":"Thinking..."}}]}

data: {"id":"chatcmpl-123","choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}

data: [DONE]
```

Key points:
- Each `data:` line is a JSON object with a `choices` array.
- Delta content is in `choices[0].delta.content`.
- Reasoning content is in `choices[0].delta.reasoning_content` (DeepSeek-compatible).
- Usage is in the top-level `usage` object with `prompt_tokens` / `completion_tokens`.
- Stream ends with `data: [DONE]`.

### Anthropic Format

```
event: message_start
data: {"type":"message_start","message":{"usage":{"input_tokens":10,"output_tokens":0}}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}

event: content_block_delta
data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"Let me think..."}}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":42}}

event: message_stop
data: {"type":"message_stop"}
```

Key points:
- Uses `event:` + `data:` line pairs separated by blank lines.
- Event types: `message_start`, `content_block_delta`, `message_delta`, `message_stop`.
- Delta types: `text_delta` (content), `thinking_delta` (reasoning).
- Usage in `message_start` has `input_tokens`/`output_tokens`; `message_delta` has `output_tokens`.

## Testing Your Adapter

Create a test file at `tests/adapters/custom/myprovider.test.ts` following the
pattern in `tests/adapters/openai/adapter.test.ts`:

1. **`createRequest`** — Verify URL, headers, and body shape for basic and overridden params.
2. **`parseSSEChunk`** — Test content, thinking, done, and usage parsing with realistic chunks.
3. **`parseError`** — Test with valid JSON body, malformed body, and various HTTP statuses.
4. **`isRateLimitError`** — Test 429, rate-related codes, and non-rate errors.

Run tests:

```bash
cd packages/backend && bun test
```

Type-check:

```bash
cd packages/backend && npx tsc --noEmit
```

## Existing Adapters as Reference

| Adapter | File | Notes |
|---------|------|-------|
| OpenAI | `adapters/openai/adapter.ts` | Simple pass-through, OpenAI SSE format |
| Anthropic | `adapters/anthropic/adapter.ts` | System message extraction, Anthropic SSE format |
| Passthrough | `adapters/custom/passthrough.ts` | Default "custom" adapter, OpenAI-compatible |
