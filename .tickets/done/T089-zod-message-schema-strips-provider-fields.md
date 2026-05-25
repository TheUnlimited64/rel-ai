# T089: Zod Message Schema Strips Provider-Specific Fields (reasoning_content)

## Phase: 2 — Core
## Related: T073 (same root cause — message z.object() without .passthrough())
## Estimated effort: S

## Description

DeepSeek V4 thinking mode requires `reasoning_content` in assistant messages for multi-turn conversations. The proxy's Zod message schema rejects unknown fields, silently stripping `reasoning_content` before forwarding to upstream. DeepSeek then rejects the incomplete messages with: `"The reasoning_content in the thinking mode must be passed back to the API."`

The error is masked by handler.ts catch blocks which replace all errors with `"An internal error occurred. Please try again later."`, making debugging extremely difficult.

### Same root cause as T073

T073 fixed `content` type + `role` enum. T073 (active) tracks `tool_calls` gaps. This ticket tracks the **message-level `.passthrough()` gap** — the Zod `z.object()` for messages has no `.passthrough()`, so ANY unknown field is silently stripped. This affects not just `reasoning_content` but any future provider-specific field.

### Two models, opposite rules

- `deepseek-reasoner` (R1): `reasoning_content` MUST NOT be sent back (causes 400)
- `deepseek-v4-pro` thinking mode: `reasoning_content` MUST be in assistant messages for multi-turn, especially with tool calls

## Blast Radius

| File | Lines | Impact |
|------|-------|--------|
| `src/routes/proxy.ts` | 33-39 | Zod message schema — strips unknown fields |
| `src/core/provider/types.ts` | 27-33 | `Message` type — no `reasoning_content` field |

## Acceptance Criteria

- [ ] `reasoning_content` field passes through Zod validation and reaches upstream providers
- [ ] `reasoning_content` present in `Message` type
- [ ] Message-level Zod schema uses `.passthrough()` so future provider-specific fields work without code changes
- [ ] Existing tests continue to pass

## Implementation Notes

- Add `reasoning_content: z.string().optional()` to message Zod schema
- Add `.passthrough()` to message `z.object()` — prevents future field-stripping regressions
- Add `reasoning_content?: string` to `Message` type in `types.ts`
- Top-level schema already has `.passthrough()` (line 43) — only message-level was missing it
