# T086: Command Code Adapter

## Phase: 2 — Proxy Core
## Depends on: T004
## Estimated effort: M

## Description

Add a `commandcode` adapter for the Command Code API. Uses the **`/alpha/generate` endpoint** — a single unified endpoint that works across all models (Anthropic, OpenAI, OSS) with a custom wire format. No dual-endpoint routing needed.

**Why `/alpha/generate` instead of `/provider/v1/*`:**
- Single endpoint for all 18+ models — no model-type detection or endpoint routing
- Custom streaming format (`text-delta`, `reasoning-delta`, `tool-call`, `finish`, `error`) — consistent across all models
- Potentially works on Go plan ($1/mo) since it's the CLI's internal endpoint (unlike `/provider/v1/*` which requires Pro $15/mo)
- Same Bearer token auth, just different request/response shape
- Confirmed working by [pi-commandcode-provider](https://github.com/patlux/pi-commandcode-provider) (patlux) and [LiteLLM issue #27582](https://github.com/BerriAI/litellm/issues/27582)

**Base URL**: `https://api.commandcode.ai`
**Endpoint**: `POST /alpha/generate`

Key files that need changes:
- `packages/shared/src/schemas/enums.ts:3` — `AdapterTypeSchema` enum must include `"commandcode"`
- `packages/backend/src/server.ts:47-50` — register new adapter in `AdapterRegistry`
- `packages/backend/src/server.ts:90` — cast type must include `"commandcode"`
- `packages/frontend/src/features/providers/components/ProviderForm.tsx:66` — label display for "commandcode" option (currently `t.charAt(0).toUpperCase() + t.slice(1)` → "Commandcode", should be "Command Code")
- `packages/frontend/src/features/providers/components/ProviderEditForm.tsx:67` — same label issue

## Acceptance Criteria

- [ ] `AdapterTypeSchema` in `packages/shared/src/schemas/enums.ts:3` includes `"commandcode"`
- [ ] New file `packages/backend/src/adapters/commandcode/adapter.ts` implements `ProviderAdapter`
- [ ] `CommandCodeAdapter.type` = `"commandcode"`
- [ ] `createRequest` builds `/alpha/generate` request:
  - [ ] URL: `{baseUrl}/alpha/generate`
  - [ ] Headers: `Authorization: Bearer {apiKey}`, `Content-Type: application/json`, `x-command-code-version: 0.24.1`, `x-cli-environment: production`
  - [ ] Body wraps messages in `params` object with `config` metadata (see Implementation Notes)
  - [ ] System messages extracted and passed as `params.system` string
  - [ ] Default `baseUrl` = `"https://api.commandcode.ai"`
- [ ] `parseSSEChunk` handles Command Code custom SSE format:
  - [ ] Parses line-delimited JSON (LDJSON) — each line is a JSON object with `type` field (no `data:`/`event:` SSE framing)
  - [ ] `type: "start"` → `null` (stream begin, no content)
  - [ ] `type: "start-step"` → `null` (echoes request body with injected system prompt, ignore)
  - [ ] `type: "reasoning-start"` → `null` (thinking block begins, tracked by `id`)
  - [ ] `type: "reasoning-delta"` → `{ thinking: event.text, done: false }`
  - [ ] `type: "reasoning-end"` → `null` (thinking block ends)
  - [ ] `type: "text-start"` → `null` (text block begins)
  - [ ] `type: "text-delta"` → `{ content: event.text, done: false }`
  - [ ] `type: "text-end"` → `null` (text block ends)
  - [ ] `type: "finish-step"` → consume usage if needed, `null` (metadata)
  - [ ] `type: "finish"` → `{ done: true, usage: { promptTokens: totalUsage.inputTokens, completionTokens: totalUsage.outputTokens } }`
  - [ ] `type: "error"` → throws/returns error
  - [ ] `type: "tool-call"` → ignored (not supported in proxy use case)
  - [ ] `type: "provider-metadata"` → `null` (cost/routing info, ignore)
  - [ ] Returns `null` for unknown/empty lines
- [ ] `parseError` extracts error from HTTP response body:
  - [ ] Non-200 response: parse body text for error message
  - [ ] Sets `retryable` = `true` for 429 and 5xx
- [ ] `isRateLimitError` detects HTTP 429
- [ ] Register adapter in `packages/backend/src/server.ts:47-50`: `registry.register(new CommandCodeAdapter())`
- [ ] Fix type cast in `packages/backend/src/server.ts:90` to include `"commandcode"`
- [ ] Frontend: "Command Code" display label in provider form dropdowns (not "Commandcode")
- [ ] Test: `createRequest` builds correct URL, headers, and body shape
- [ ] Test: `createRequest` extracts system messages into `params.system` field
- [ ] Test: `parseSSEChunk` parses `text-delta` events
- [ ] Test: `parseSSEChunk` parses `reasoning-delta` events → thinking content
- [ ] Test: `parseSSEChunk` parses `finish` event with usage
- [ ] Test: `parseSSEChunk` ignores `tool-call` events
- [ ] Test: `parseError` with non-200 response
- [ ] Test: `isRateLimitError` true for 429, false otherwise
- [ ] Test: default baseUrl = `https://api.commandcode.ai`

## Implementation Notes

### API Wire Format (from pi-commandcode-provider source)

**Request shape:**
```json
{
  "config": {
    "workingDir": "/tmp",
    "date": "2026-05-24",
    "environment": "linux-x64, Node.js v22.0.0",
    "structure": [],
    "isGitRepo": false,
    "currentBranch": "",
    "mainBranch": "",
    "gitStatus": "",
    "recentCommits": []
  },
  "memory": "",
  "taste": "",
  "skills": null,
  "permissionMode": "standard",
  "params": {
    "model": "deepseek/deepseek-v4-flash",
    "messages": [
      { "role": "user", "content": "hello" }
    ],
    "tools": [],
    "system": "You are a helpful assistant.",
    "max_tokens": 4096,
    "stream": true
  }
}
```

**Required headers (from pi-commandcode-provider's `index.ts` and `core.ts`):**
```
Authorization: Bearer <API_KEY>
Content-Type: application/json
x-command-code-version: 0.24.1
x-cli-environment: production
x-project-slug: pi-cc
x-taste-learning: false
x-co-flag: false
x-session-id: <uuid>
```

**Response: line-delimited JSON stream (NOT SSE)**
Each line is a bare JSON object (no `data:` prefix, no `event:` prefix). This is LDJSON, not SSE.

**Verified stream event types (tested 2026-05-24 with Go plan, `deepseek/deepseek-v4-flash`):**

| Event type | Fields | Maps to | Notes |
|-----------|--------|---------|-------|
| `start` | none | ignore | Stream begins |
| `start-step` | `request` (echoes full request body) | ignore | CC injects system prompt — visible in echo |
| `reasoning-start` | `id`, `providerMetadata` | ignore | Thinking block begins |
| `reasoning-delta` | `id`, `text` | `ParsedChunk.thinking` | Incremental thinking tokens |
| `reasoning-end` | `id` | ignore | Thinking block ends |
| `text-start` | `id` | ignore | Text block begins |
| `text-delta` | `id`, `text` | `ParsedChunk.content` | Incremental content tokens |
| `text-end` | `id` | ignore | Text block ends |
| `tool-call` | `toolCallId`, `toolName`, `input`/`args`/`arguments` | ignore | Not needed for proxy |
| `finish-step` | `finishReason`, `usage`, `providerMetadata` | ignore (or extract usage) | Per-step stats + cost |
| `finish` | `finishReason`, `totalUsage` | `ParsedChunk.done=true` + usage | Final stats |
| `error` | `error.message` or `error` (string) | Error | Stream error |
| `provider-metadata` | `providerMetadata` | ignore | Cost/routing metadata |

**IMPORTANT:** The stream is NOT `data:`-prefixed SSE. Each line is raw JSON. `parseSSEChunk` must handle both formats:
- If line starts with `data:` → strip prefix, parse JSON (fallback for non-stream responses)
- If line is bare JSON → parse directly (primary `/alpha/generate` format)

**`finish` event usage shape (verified):**
```json
{
  "type": "finish",
  "finishReason": "stop",
  "totalUsage": {
    "inputTokens": 7527,
    "outputTokens": 15,
    "totalTokens": 7542,
    "reasoningTokens": 13,
    "cachedInputTokens": 7424,
    "inputTokenDetails": {
      "noCacheTokens": 103,
      "cacheReadTokens": 7424
    },
    "outputTokenDetails": {
      "textTokens": 2,
      "reasoningTokens": 13
    }
  }
}
```

**`finishReason` values:** `"stop"`, `"length"` / `"max_tokens"` / `"max-tokens"` / `"max_output_tokens"`, `"tool-calls"`

**`error` event shape (verified):**
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "status": 400,
    "message": "Invalid request error...",
    "docs": "https://commandcode.ai/docs/reference/errors/bad_request"
  }
}
```

**`/alpha/generate` does NOT support `stream: false`** — returns 400 with `expected true at "params.stream"`. Adapter must always set `stream: true` regardless of `params.stream` input. For non-stream requests, the proxy collects all chunks and returns the assembled response.

**Go plan test results (verified 2026-05-24):**
- ✅ `GET /provider/v1/models` — 200, lists all 21 models
- ❌ `POST /provider/v1/chat/completions` — 403 `upgrade_required`
- ❌ `POST /provider/v1/messages` — 403 `upgrade_required`
- ✅ `POST /alpha/generate` — 200, streaming works on Go plan

### Adapter Implementation Sketch

```typescript
export class CommandCodeAdapter implements ProviderAdapter {
  readonly type = "commandcode";

  createRequest(params) {
    const apiKey = (params.overrides?.apiKey as string) ?? this.defaultApiKey ?? "";
    const baseUrl = (params.overrides?.baseUrl as string) ?? this.defaultBaseUrl ?? "https://api.commandcode.ai";

    // Extract system messages
    const systemMessage = params.messages
      .filter(m => m.role === "system")
      .map(m => m.content)
      .join("\n");

    const nonSystemMessages = params.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    const max_tokens = (params.overrides?.max_tokens as number | undefined) ?? 4096;

    // Strip internal keys
    const { apiKey: _a, baseUrl: _b, max_tokens: _m, ...restOverrides } = params.overrides ?? {};

    // CRITICAL: /alpha/generate requires stream:true — force it
    const body = {
      config: {
        workingDir: "/tmp",
        date: new Date().toISOString().split("T")[0],
        environment: "server",
        structure: [],
        isGitRepo: false,
        currentBranch: "",
        mainBranch: "",
        gitStatus: "",
        recentCommits: [],
      },
      memory: "",
      taste: "",
      skills: null,
      permissionMode: "standard",
      params: {
        model: params.model,
        messages: nonSystemMessages,
        tools: [],
        system: systemMessage || "",
        max_tokens,
        stream: true, // ALWAYS true — stream:false returns 400
        ...restOverrides,
      },
    };

    return {
      url: `${baseUrl}/alpha/generate`,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "x-command-code-version": "0.24.1",
        "x-cli-environment": "production",
      },
      body,
    };
  }

  parseSSEChunk(chunk: string): ParsedChunk | null {
    // LDJSON format: bare JSON lines (NOT SSE with data: prefix)
    // Also handle data:-prefixed lines as fallback
    const lines = chunk.split("\n");
    let content: string | undefined;
    let thinking: string | undefined;
    let done = false;
    let usage: TokenUsage | undefined;

    for (const line of lines) {
      let trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith("data:")) trimmed = trimmed.slice(5).trim();

      let parsed: Record<string, unknown>;
      try { parsed = JSON.parse(trimmed); } catch { continue; }

      switch (parsed.type) {
        case "text-delta":
          content = (content ?? "") + (parsed.text as string ?? "");
          break;
        case "reasoning-delta":
          thinking = (thinking ?? "") + (parsed.text as string ?? "");
          break;
        case "finish": {
          done = true;
          const tu = parsed.totalUsage as Record<string, unknown> | undefined;
          if (tu) {
            usage = {
              promptTokens: (tu.inputTokens as number) ?? 0,
              completionTokens: (tu.outputTokens as number) ?? 0,
            };
          }
          break;
        }
        // start, start-step, reasoning-start, reasoning-end,
        // text-start, text-end, finish-step, provider-metadata → ignore
      }
    }

    if (!content && !thinking && !done && !usage) return null;
    return {
      ...(content !== undefined ? { content } : {}),
      ...(thinking !== undefined ? { thinking } : {}),
      done,
      ...(usage !== undefined ? { usage } : {}),
    };
  }
}
```

### Available Models

| Category | Models |
|----------|--------|
| **Anthropic** | `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-haiku-4-5-20251001` |
| **OpenAI** | `gpt-5.5`, `gpt-5.4`, `gpt-5.3-codex`, `gpt-5.4-mini` |
| **OSS** | `deepseek/deepseek-v4-pro`, `deepseek/deepseek-v4-flash`, `moonshotai/Kimi-K2.6`, `moonshotai/Kimi-K2.5`, `zai-org/GLM-5.1`, `zai-org/GLM-5`, `MiniMaxAI/MiniMax-M2.7`, `MiniMaxAI/MiniMax-M2.5`, `Qwen/Qwen3.6-Max-Preview`, `Qwen/Qwen3.6-Plus` |

### API Constraints

- `/alpha/generate` may work on Go plan ($1/mo) — CLI's internal endpoint, not plan-gated like `/provider/v1/*`
- `/provider/v1/*` endpoints require Pro plan ($15/mo) minimum — 403 `upgrade_required` on Go plan
- Auth: `Authorization: Bearer <API_KEY>` (key prefix `cc_live_...` or `user_...`)
- Rate limits governed by upstream providers
- Images supported in messages
- `n > 1` not allowed (strip from overrides)

### Fallback: `/provider/v1/*` Endpoints (Pro+ only)

If `/alpha/generate` proves unreliable or gets deprecated, implement dual-endpoint routing:
- Claude models → `POST /provider/v1/messages` (Anthropic wire format)
- All others → `POST /provider/v1/chat/completions` (OpenAI wire format)
- Error shapes differ: OpenAI `{error:{message,type,code}}`, Anthropic `{type:"error",error:{type,message}}`
- This approach requires model-type detection and dual SSE parsing (see original ticket draft)

### Frontend Label

`ProviderForm.tsx:66` and `ProviderEditForm.tsx:67` render labels as `t.charAt(0).toUpperCase() + t.slice(1)`, which produces "Commandcode". Add a display name map:
```typescript
const DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  custom: "Custom",
  commandcode: "Command Code",
};
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `packages/shared/src/schemas/enums.ts` | Add `"commandcode"` to enum |
| `packages/backend/src/adapters/commandcode/adapter.ts` | Create — main adapter |
| `packages/backend/src/server.ts` | Register adapter, fix cast |
| `packages/frontend/src/features/providers/components/ProviderForm.tsx` | Display name map |
| `packages/frontend/src/features/providers/components/ProviderEditForm.tsx` | Display name map |
| `packages/backend/tests/adapters/commandcode/adapter.test.ts` | Create — full test suite |

### Reference Implementations

- [pi-commandcode-provider](https://github.com/patlux/pi-commandcode-provider) — pi extension using `/alpha/generate` (TypeScript, MIT license). Key files: `src/core.ts` (stream parser + request builder), `src/converters.ts` (`parseStreamEventLine`, `messagesToCC`, `mapFinishReason`), `index.ts` (model definitions, headers)
- [LiteLLM issue #27582](https://github.com/BerriAI/litellm/issues/27582) — documents `/alpha/generate` endpoint payload and stream format
