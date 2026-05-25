# T094: Expand Incomplete Backend Test Coverage

## Phase: 5 — Quality
## Depends on: T007, T008, T093
## Estimated effort: M

## Description

2 existing backend test files have significant gaps. They test happy paths but miss edge cases that represent real failure modes in production — disabled providers, circular model references, streaming, timeouts, tool_calls, and usage aggregation.

### Incomplete Test Files

| # | File | What's Tested | What's Missing |
|---|------|---------------|----------------|
| 1 | `packages/backend/tests/core/model/resolver.test.ts` | basic resolution, multiple providers, priority, health-based failover | disabled provider, `unhealthyDuration`, deep circular deps, all providers down, model not found |
| 2 | `packages/backend/tests/core/proxy/handler.test.ts` | basic non-streaming proxy, error mapping | streaming, timeout, tool_calls forwarding, usage aggregation, upstream abort, large response bodies |

## Acceptance Criteria

### model/resolver.test.ts — New Test Cases
- [ ] Disabled provider: provider with `enabled: false` skipped during resolution, not selected as fallback
- [ ] `unhealthyDuration`: provider marked unhealthy within threshold → skipped; outside threshold → retried
- [ ] Deep circular dependency: model A → model B → model A → resolver detects cycle, returns error not stack overflow
- [ ] All providers down: every provider unhealthy → returns clear "no available provider" error
- [ ] Model not found: requested model ID doesn't exist → returns `ModelNotFound` error
- [ ] Provider with zero priority: edge case, should still be selectable if only option
- [ ] Concurrent resolution requests: same model resolved concurrently → same result, no double work

### proxy/handler.test.ts — New Test Cases
- [ ] Streaming proxy: request with `stream: true` → SSE chunks forwarded correctly, `[DONE]` appended
- [ ] Streaming error mid-stream: upstream drops connection mid-stream → client gets error event, connection cleaned up
- [ ] Timeout: request exceeds configured timeout → `504 Gateway Timeout`, upstream connection aborted
- [ ] `tool_calls` forwarding: request with tool_use messages → `tool_calls` in response preserved
- [ ] Usage aggregation: response includes `usage.prompt_tokens` + `usage.completion_tokens` → log matches
- [ ] Upstream abort: client disconnects mid-request → upstream connection properly terminated (no leak)
- [ ] Large response body: 10MB+ response → streams through without OOM or truncation
- [ ] Concurrent requests through same handler instance: no shared state corruption

## Implementation Notes

- **Resolver tests**: These are mostly pure-function tests. Mock provider health data, assert resolution output. The `unhealthyDuration` test may need `vi.useFakeTimers()` for time-based expiry.
- **Handler tests**: Streaming tests require mocking the upstream fetch response as a ReadableStream. See existing adapter tests for stream mocking patterns.
- **Timeout tests**: Use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`. Do NOT use real `setTimeout` with exact ms — flaky in CI.
- **Tool calls**: Check both OpenAI and Anthropic message shapes. `tool_calls` on `delta` for streaming, on `message` for non-streaming.
- **Usage aggregation**: Verify that the logged usage matches what the upstream actually returned, not a default/fallback value.
