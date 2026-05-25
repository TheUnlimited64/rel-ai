# T037: Provider Error Messages Forwarded to Clients

## Phase: 5 — Security Hardening
## Depends on: T008
## Estimated effort: S

## Description

`core/proxy/handler.ts:155` and line 189 pass provider error `message` directly to client responses. Internal URLs, provider names, stack traces, and API structure leak through.

```ts
message: result.error.message,   // line 149
message: providerError.message,  // line 173
```

Example: Anthropic returns `"model claude-3-opus not found for api-key sk_ant_..."` — client sees provider name and key prefix.

## Acceptance Criteria

- [ ] Production: map provider errors to generic messages (e.g. "Upstream provider error")
- [ ] Full error details logged server-side only
- [ ] Development mode: preserve detailed errors for debugging
- [ ] Test: 502 response contains no provider name/URL/stack trace in production

## Implementation Notes

- Check `process.env.NODE_ENV` or add config flag
- Create error message sanitizer utility in proxy module
- Preserve error `code` field (e.g. `rate_limit`, `invalid_request`) — useful for clients
