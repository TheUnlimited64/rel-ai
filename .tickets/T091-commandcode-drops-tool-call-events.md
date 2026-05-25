# T091: CommandCode Adapter Drops Tool-Call Stream Events

## Phase: 5 — Quality
## Depends on: T086, T090
## Estimated effort: S

## Description

`CommandCodeAdapter.parseSSEChunk()` only handles 4 event types from CC's LDJSON stream: `text-delta`, `reasoning-delta`, `finish`, `error`. All other event types hit `default: break` → returned as `null` → silently dropped.

When opencode spawns a subagent, CC streams tool-call events (`tool-input-start`, `tool-input-delta`, `tool-input-end`, `tool-call`) that the adapter ignores. Result: opencode never receives the tool call → subagent "thinks" but never executes.

**Debug log evidence** (captured via diagnostic logging added in this session):
- 58 `tool-input-delta` events dropped (tool argument chunks)
- 2 `tool-input-start` events dropped (tool call begins)
- 2 `tool-input-end` events dropped (tool call argument stream ends)
- 1 `tool-call` event dropped (complete tool call with `toolName: "task"`)
- 2 `finish-step` events dropped (carry `finishReason: "tool-calls"` + usage data)
- 2 `start-step` / 2 `start` events dropped
- 2 `reasoning-start` / 2 `reasoning-end` events dropped
- 2 `provider-metadata` events dropped
- 1 `text-start` / 1 `text-end` events dropped

## Acceptance Criteria

- [ ] `tool-input-start` → emits `ToolCallDelta` with `id` and `function.name` (start of tool call)
- [ ] `tool-input-delta` → appends `function.arguments` delta to ongoing tool call
- [ ] `tool-input-end` → finalizes tool call argument streaming
- [ ] `tool-call` → emits complete `ToolCallDelta[]` (non-streaming fallback)
- [ ] `finish-step` → propagates `finishReason` (e.g. `"tool-calls"` → `"tool_calls"`) and usage
- [ ] Subagent spawning through CC adapter works end-to-end
- [ ] Existing CC adapter tests still pass
- [ ] New test cases for tool-call streaming events

## Implementation Notes

### CC Event → OpenAI ToolCallDelta Mapping

CC uses a streaming tool-call protocol different from OpenAI:
- **OpenAI**: `tool_calls[{ index, id, function: { name, arguments } }]` in delta chunks
- **CC**: Separate `tool-input-start` (id + toolName) → `tool-input-delta` (argument chunks) → `tool-input-end` lifecycle

Key mapping:
```
tool-input-start: { id, toolName }
  → ToolCallDelta: { index: N, id, type: "function", function: { name: toolName } }

tool-input-delta: { id, delta }
  → ToolCallDelta: { index: N, function: { arguments: delta } }

tool-input-end: { id }
  → (no delta needed, just marks end)

tool-call: { toolCallId, toolName, input }
  → ToolCallDelta: { index: N, id: toolCallId, type: "function", function: { name: toolName, arguments: JSON.stringify(input) } }
```

### State Management Required

`parseSSEChunk` is currently stateless (pure function). Tool-call streaming requires tracking active tool calls across chunks (map call ID → { index, name, accumulated args }). This needs either:
1. Instance-level state on the adapter (simple, but adapter is currently stateless)
2. A stateful stream parser wrapper used by `handleStream` in handler.ts

Option 1 is simpler and matches how other adapters handle streaming tool calls. The adapter instance is created per-request lifecycle effectively (one adapter per provider in the registry, but `parseSSEChunk` calls are sequential within a stream).

### finish-step → finish_reason Mapping

```
CC "tool-calls" → OpenAI "tool_calls"
CC "stop" → OpenAI "stop"
CC "length" → OpenAI "length"
```

### Affected Files

- `packages/backend/src/adapters/commandcode/adapter.ts` — primary fix location
- `packages/backend/tests/adapters/commandcode/adapter.test.ts` — new test cases

### Diagnostic Logging

Debug logging was added in this session to `adapter.ts` (→ `/tmp/rel-ai-cc-debug.log`) and `handler.ts` (→ `/tmp/rel-ai-stream-debug.log`). This logging should be removed once the fix is verified.
