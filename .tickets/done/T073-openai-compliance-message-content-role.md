# T073: OpenAI Compliance — Message Content and Role Schema Too Restrictive

## Phase: 2 — Core
## Estimated effort: M

## Description

The proxy rejects valid OpenAI API requests with `"Invalid request body"` (400) because the Zod validation schema is stricter than the actual OpenAI spec. Confirmed via debug logging: `messages[2].content` was an array, Zod returned `"Invalid input: expected string, received array"`.

### Gap 1: `content` only accepts `string`

OpenAI allows `content` to be:
- `string` — simple text
- `ContentPart[]` — array of content parts (multimodal: text + image_url)
- `null` — on assistant messages with tool_calls

Our schema: `content: z.string()` rejects all non-string values.

### Gap 2: `role` enum missing `"tool"`

OpenAI accepts: `"system" | "user" | "assistant" | "tool" | "developer"`
Our schema: `role: z.enum(["system", "user", "assistant"])` rejects `"tool"` and `"developer"`.

## Blast Radius

| File | Lines | Impact |
|------|-------|--------|
| `src/core/provider/types.ts` | 2-4 | `Message` type definition — root change |
| `src/routes/proxy.ts` | 12-23 | Zod schema — API boundary |
| `src/adapters/anthropic/adapter.ts` | 24, 29 | `m.content` — assumes string, `.join("\n")` |
| `src/adapters/commandcode/adapter.ts` | 27, 32 | `m.content` — same pattern as anthropic |
| `src/adapters/openai/adapter.ts` | 27 | Passes `Message[]` directly — low impact |
| `src/adapters/custom/passthrough.ts` | 34 | Pass-through — low impact |
| `src/adapters/custom/template.ts` | 46 | Pass-through — low impact |

## Acceptance Criteria

- [ ] Request with `content` as array passes validation
- [ ] Request with `content: null` passes validation
- [ ] Request with `role: "tool"` passes validation
- [ ] Anthropic adapter correctly converts multimodal content to string
- [ ] CommandCode adapter correctly converts multimodal content to string
- [ ] Existing tests continue to pass

## Implementation Notes

- Update `Message` type: `content: string | ContentPart[] | null`
- Update Zod schema: `content: z.union([z.string(), z.array(ContentPartSchema), z.null()])`
- Add `"tool"` (and `"developer"`) to role enum in both Zod schema and Message type
- Anthropic/CommandCode adapters need content normalization before string operations (extract text from ContentPart[])
- Passthrough/OpenAI adapters forward content as-is — minimal change needed
