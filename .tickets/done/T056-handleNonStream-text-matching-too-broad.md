# T056: handleNonStream Matches text/* Too Broadly

## Phase: 5 — Quality
## Depends on: T008
## Estimated effort: XS

## Description

`core/proxy/handler.ts:380` — content-type check too broad:

```ts
if (contentType.includes("text/event-stream") || contentType.includes("text/")) {
```

`text/` matches `text/plain`, `text/html`, etc. Non-SSE text responses would be parsed as SSE chunks → garbled output or crash.

## Acceptance Criteria

- [ ] Remove `text/` fallback — only match `text/event-stream`
- [ ] For `text/plain`: treat as raw content or return error
- [ ] Test: provider returns `text/plain` → not parsed as SSE

## Implementation Notes

- Single condition fix
- Log warning if unexpected content-type received from provider
