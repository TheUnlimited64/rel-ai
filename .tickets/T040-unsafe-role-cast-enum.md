# T040: Unsafe `as` Cast for Message Role Union Type

## Phase: 5 — Security Hardening
## Depends on: T014
## Estimated effort: S

## Description

`routes/proxy.ts:127` — Zod schema validates `role: z.string().min(1)` (any string passes). Then `as` cast narrows to `"system" | "user" | "assistant"` union — a lie.

```ts
messages: messages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
```

Invalid roles (e.g. `"function"`, `"tool"`, empty after trim) reach providers causing errors.

## Acceptance Criteria

- [ ] Change Zod schema: `role: z.enum(["system", "user", "assistant"])`
- [ ] Remove `as` cast — type should flow from Zod validation
- [ ] Handle error: return 400 with helpful message when invalid role provided
- [ ] Test: `role: "function"` → 400 error
- [ ] Test: `role: "system"` → accepted

## Implementation Notes

- `z.enum()` provides better error messages: "Expected 'system' | 'user' | 'assistant', received 'function'"
- Consider adding `"tool"` and `"function"` roles later if needed by providers
