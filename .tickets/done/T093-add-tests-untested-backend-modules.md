# T093: Add Tests for Untested Backend Modules

## Phase: 5 — Quality
## Depends on: T008, T012, T015, T016
## Estimated effort: L

## Description

4 backend modules have zero test coverage. These modules contain core business logic — endpoint validation, SSE parsing, stream formatting, and log queries — that directly affect proxy correctness, API compliance, and operational visibility. A bug in any of these goes undetected until production failure.

### Untested Modules

| # | Module | Key Functions | Risk |
|---|--------|---------------|------|
| 1 | `packages/backend/src/core/endpoint/service.ts` | `validatePath()`, endpoint CRUD logic | Bad path validation → routing failures, security bypass |
| 2 | `packages/backend/src/core/proxy/sse-utils.ts` | `parseOpenAISSE()`, `parseOpenAIError()` | Broken SSE → all streaming fails silently |
| 3 | `packages/backend/src/core/proxy/formatter.ts` | `formatStreamChunk()`, `formatCompletion()`, `toOpenAIUsage()` | Wrong format → OpenAI non-compliant responses |
| 4 | `packages/backend/src/core/logging/query.ts` | `RequestLogQuery.list()`, `RequestLogQuery.stats()` | Wrong filters → incorrect billing/analytics |

## Acceptance Criteria

### endpoint/service.ts
- [ ] `validatePath()`: valid paths accepted, invalid paths rejected, leading/trailing slash normalization
- [ ] `validatePath()`: reserved paths blocked (`/admin`, `/api`, etc.)
- [ ] Endpoint CRUD: create with valid provider, duplicate path rejected, update preserves API key
- [ ] Endpoint deletion cascade behavior tested

### proxy/sse-utils.ts
- [ ] `parseOpenAISSE()`: valid `data: {...}\n\n` events parsed correctly
- [ ] `parseOpenAISSE()`: `[DONE]` sentinel handled
- [ ] `parseOpenAISSE()`: malformed JSON in `data:` line → error, not crash
- [ ] `parseOpenAISSE()`: multi-line events, events with `event:` field
- [ ] `parseOpenAIError()`: known error shapes → correct error object
- [ ] `parseOpenAIError()`: unknown/garbage → graceful fallback

### proxy/formatter.ts
- [ ] `formatStreamChunk()`: delta → correct SSE chunk string
- [ ] `formatStreamChunk()`: tool_calls delta formatted per OpenAI spec
- [ ] `formatCompletion()`: non-streaming response shaped correctly
- [ ] `toOpenAIUsage()`: token counts map to `prompt_tokens` / `completion_tokens` / `total_tokens`
- [ ] `toOpenAIUsage()`: missing/null token data → sensible defaults, not crash

### logging/query.ts
- [ ] `RequestLogQuery.list()`: default pagination, date range filters, provider/model filter
- [ ] `RequestLogQuery.list()`: empty result → empty array, not null/throw
- [ ] `RequestLogQuery.stats()`: aggregates correct (total requests, tokens, error rates)
- [ ] `RequestLogQuery.stats()`: no logs → zero counts, not NaN/null

## Implementation Notes

- Follow existing test patterns in `packages/backend/tests/` — see `core/proxy/handler.test.ts` and `core/model/resolver.test.ts` for style.
- SSE parsing tests: provide raw SSE strings, assert parsed event arrays. No HTTP mocking needed — these are pure functions.
- Formatter tests: pure function testing. Provide input objects, assert output strings.
- Query tests: use in-memory SQLite (follow `side-effects.test.ts` pattern) or mock the DB layer. Prefer real DB for integration confidence.
- `validatePath()` is likely a pure function — easiest to test first.
