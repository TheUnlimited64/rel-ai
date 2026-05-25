# T090: CommandCode Adapter — Fix 404 Errors and Match Reference Implementation

## Phase: 3 — Core Features
## Depends on: T004 (provider-adapter-interface), T005 (openai-adapter)
## Estimated effort: M

## Description

CommandCode adapter returns HTTP 404 on all requests. Debug logging (`/tmp/llmpack-debug.log`) confirms:

```
proxy-log {"adapterType":"commandcode","status":404,"error":"Unknown error","providerErrorCode":"unknown"}
```

Three distinct problems, all contributing to the failure:

### 1. Test-connection hits non-existent endpoint

`testProviderConnection()` in `packages/backend/src/core/provider/service.ts:194` hardcodes `${baseUrl}/v1/models` for ALL adapter types. CommandCode API only exposes `/alpha/generate` — it has no `/v1/models`. Result: frontend "Test Connection" always fails with 404 for CommandCode providers.

**Fix**: Add adapter-specific health check. Either:
- (A) Add `testConnection?(baseUrl: string, apiKey: string): Promise<{success, error?, latencyMs}>` to `ProviderAdapter` interface — each adapter defines its own test URL/logic
- (B) For CommandCode, POST a minimal request to `/alpha/generate` and check for non-404 response

### 2. `parseError()` silently drops response body

`CommandCodeAdapter.parseError()` in `packages/backend/src/adapters/commandcode/adapter.ts:163-183` tries `response.json()` expecting `{error: {code, message, status}}`. When the upstream returns non-JSON (HTML 404 page, plain text), the `catch {}` on L175 silently swallows the parse error, returning `"Unknown error"`. The actual upstream error message is permanently lost.

**Fix**: Read `response.text()` first. Try JSON parse on the text. If it fails, use the raw text (truncated) as the error message. This matches the reference implementation at `patlux/pi-commandcode-provider/src/core.ts` which does:
```ts
const errBody = await response.text().catch(() => "")
throw new Error(`Command Code API error ${response.status}: ${errBody.slice(0, 500)}`)
```

### 3. Missing required headers

Reference implementation (`patlux/pi-commandcode-provider/index.ts` + `src/core.ts`) sends these headers that our adapter is missing:

| Header | Reference | Our Adapter |
|--------|-----------|-------------|
| `x-project-slug` | `"pi-cc"` | ❌ Missing |
| `x-taste-learning` | `"false"` | ❌ Missing |
| `x-co-flag` | `"false"` | ❌ Missing |
| `x-session-id` | `randomUUID()` | ❌ Missing |

These may be required by the CommandCode API for request routing/validation. Missing headers could contribute to 404 or other errors.

## Acceptance Criteria

- [ ] `CommandCodeAdapter.parseError()` captures raw response body on JSON parse failure — no more `"Unknown error"` when upstream returns non-JSON
- [ ] `testProviderConnection()` uses adapter-specific health check URL (not hardcoded `/v1/models`) — CommandCode test-connection no longer 404s
- [ ] CommandCode adapter sends all required headers matching reference implementation (`x-project-slug`, `x-taste-learning`, `x-co-flag`, `x-session-id`)
- [ ] Debug log shows actual upstream error text for failed CommandCode requests (not `"Unknown error"`)
- [ ] End-to-end: CommandCode proxy request succeeds with valid API key
