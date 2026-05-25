# T039: ChatCompletionSchema Strips OpenAI Parameters

## Phase: 2 — Proxy Core
## Depends on: T014
## Estimated effort: S

## Description

`routes/proxy.ts:11-22` — `ChatCompletionSchema` only allows `model`, `messages`, `stream`. All other OpenAI-compatible parameters (`temperature`, `max_tokens`, `top_p`, `stop`, `frequency_penalty`, etc.) are silently stripped by Zod validation.

Proxy is OpenAI-incompatible by design — clients sending standard params get unexpected behavior with no warning.

## Acceptance Criteria

- [ ] Add `.passthrough()` to `ChatCompletionSchema` or explicitly list common params
- [ ] Forwarded `overrides` object passes all extra params to provider adapter
- [ ] Test: request with `temperature`, `max_tokens` forwards to provider
- [ ] Test: unknown params passed through (passthrough mode)

## Implementation Notes

- Simplest fix: add `.passthrough()` to schema
- Better: explicitly list known params for documentation/validation, but still passthrough unknowns
- `overrides` in adapter interface should spread all non-model/messages/stream fields
