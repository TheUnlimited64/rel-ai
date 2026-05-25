# T073: Tool Calls Not OpenAI-Compliant in Proxy Pipeline

## Phase: 2 — Core
## Depends on: none
## Estimated effort: L

## Description

Agents (opencode) connected to rel-ai hang when spawning subagents. Root cause: tool calls are completely missing from every layer of the proxy pipeline. The proxy strips/ignores `tool_calls` from both streaming and non-streaming responses, and strips `tool_call_id`/`name` from incoming tool-result messages.

## Gaps (12 identified)

### Types
1. `ParsedChunk` (types.ts:10-15): No `tool_calls` field. Only `content`, `thinking`, `done`, `usage`.
2. `Message` (types.ts:5-8): No `tool_calls`, `tool_call_id`, `name`. Only `role`, `content`.
3. `OpenAIStreamChunk.delta` (formatter.ts:10): Typed `Record<string, string>`. Must allow `tool_calls` array objects.
4. `OpenAICompletion.message` (formatter.ts:27): Typed `{ role: string; content: string }`. Must include `tool_calls`.

### Pipeline
5. `formatStreamChunk` (formatter.ts:37-66): Only emits `delta.content` + `delta.reasoning_content`. Never `delta.tool_calls`. `finish_reason` hardcoded to `"stop"`.
6. `formatCompletion` (formatter.ts:72-94): Only emits `message.content`. Never `message.tool_calls`. `finish_reason` hardcoded to `"stop"`.
7. `parseOpenAISSE` (sse-utils.ts:8-68): Only extracts `delta.content` + `delta.reasoning_content`. Never `delta.tool_calls`.
8. `handleStream` (handler.ts:373): Only forwards chunks with `parsed.content || parsed.thinking`. Tool calls silently dropped.
9. `handleNonStream` (handler.ts:462-464): Only extracts `msg.content` from JSON. Tool calls silently dropped.
10. `ChatCompletionSchema` (proxy.ts:17-28): Message schema only validates `role` + `content`. `tool_calls`/`tool_call_id`/`name` stripped by Zod.

### Adapters
11. `AnthropicAdapter._parseSingleEvent` (adapter.ts:80-138): Handles `text_delta` + `thinking_delta`. Does NOT handle `tool_use` content blocks (`content_block_start` with `type: "tool_use"`, `content_block_delta` with `type: "input_json_delta"`).
12. `AnthropicAdapter.createRequest` (adapter.ts:36-38): `contentToString()` strips `tool_use` content blocks. Tool result messages lose `tool_call_id`.

## Acceptance Criteria

- [ ] Streaming: proxy forwards `delta.tool_calls` from upstream OpenAI responses
- [ ] Non-streaming: proxy forwards `message.tool_calls` from upstream OpenAI responses
- [ ] `finish_reason: "tool_calls"` preserved instead of overridden to `"stop"`
- [ ] Incoming messages with `tool_calls`/`tool_call_id`/`name` survive Zod validation
- [ ] Anthropic adapter parses `tool_use` content blocks and converts to OpenAI `tool_calls` format
- [ ] Anthropic adapter preserves `tool_call_id` on tool-result messages in `createRequest`
- [ ] Test: streaming tool call request → response contains `delta.tool_calls`
- [ ] Test: non-streaming tool call request → response contains `message.tool_calls`
- [ ] Test: messages with `tool_calls`/`tool_call_id` survive Zod validation
- [ ] Test: Anthropic `tool_use` content block → OpenAI `tool_calls` conversion

## OpenAI Tool Call Spec Reference

Streaming:
```json
{"choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"get_weather","arguments":""}}]},"finish_reason":null}]}
{"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"{\"loc"}}]},"finish_reason":null}]}
{"choices":[{"delta":{},"finish_reason":"tool_calls"}]}
```
Non-streaming:
```json
{"choices":[{"message":{"role":"assistant","content":null,"tool_calls":[{"id":"call_abc","type":"function","function":{"name":"get_weather","arguments":"{\"location\":\"Paris\"}"}}]},"finish_reason":"tool_calls"}]}
```
Tool result message:
```json
{"role":"tool","tool_call_id":"call_abc","content":"22°C"}
```

## Implementation Notes

- ParsedChunk needs `tool_calls` field: array of `{index, id?, type?, function?: {name?, arguments?}}`
- Message needs `tool_calls?`, `tool_call_id?`, `name?` fields
- formatter.ts delta type must allow objects, not just strings
- handler.ts must forward chunks with `parsed.tool_calls` in addition to content/thinking
- handler.ts must use `parsed.finishReason` or detect tool_calls to set `finish_reason: "tool_calls"`
- Zod schema: add `.passthrough()` to individual message objects, or explicitly add optional fields
- Anthropic adapter: handle `content_block_start` with `type: "tool_use"` → emit ParsedChunk with tool_calls
- Anthropic adapter: handle `content_block_delta` with `type: "input_json_delta"` → accumulate arguments
- Anthropic adapter: preserve `tool_call_id`/`name` on tool-role messages in createRequest
