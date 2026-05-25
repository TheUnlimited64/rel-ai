# rel-ai (llmpack_v2) — Comprehensive Code Review

**Date**: 2026-05-25  
**Reviewer**: Automated codebase audit  
**Scope**: Full stack — backend, frontend, shared, infra  

---

## Executive Summary

rel-ai is a private self-hosted LLM proxy that routes requests through a single OpenAI-compatible endpoint to multiple providers with fallback. The codebase has **serious production-readiness gaps**: the OpenAI compatibility layer strips most request parameters, several security vulnerabilities exist (SQL injection, error leaking, XSS vectors), test coverage is overwhelmingly shallow, and infrastructure configurations are missing basic hardening.

**Critical blockers for production**: SQL injection (T036), provider error leaking (T037), ephemeral encryption key.  
**Critical blockers for OpenAI compatibility**: Request schema strips all params except model/messages/stream (T039).

**Ticket status**: 56 active (T033–T088), 33 done (T001–T034). All checked active tickets verified as still-present issues.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  Client (OpenAI SDK / curl)                      │
│    → /v1/:endpointPath/chat/completions          │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  Hono HTTP Server (server.ts)                    │
│  ├─ tRPC 5 API (router.ts)                      │
│  │   ├─ provider/endpoint/model CRUD             │
│  │   └─ request-log queries                      │
│  ├─ Proxy Route (proxy.ts)                       │
│  │   └─ ChatCompletionSchema → ProxyHandler      │
│  └─ Static auth (Bearer token)                   │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  ProxyHandler (handler.ts)                       │
│  ├─ Resolver: virtual model → real model+provider│
│  ├─ Registry: adapter lookup                     │
│  ├─ Fallback loop (MAX_FALLBACK_ATTEMPTS=5)      │
│  └─ Formatter: normalize response to OpenAI shape │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│  Adapters                                        │
│  ├─ OpenAI adapter                               │
│  ├─ Anthropic adapter                            │
│  └─ Custom HTTP adapter                          │
└─────────────────────────────────────────────────┘
```

**Stack**: Bun runtime, Hono + tRPC 5 + Drizzle ORM (SQLite), React 19 + Vite 8 + shadcn/ui, Vitest/Playwright, Docker Compose. Monorepo: `packages/backend`, `packages/frontend`, `packages/shared`.

---

## 2. Critical Issues

### 2.1 OpenAI Request Compatibility (T039) — **CRITICAL**

**File**: `packages/backend/src/proxy/proxy.ts` (lines 11–22, 122–130)

`ChatCompletionSchema` accepts only `model`, `messages` (role: string + content: string), `stream`. **Every other OpenAI parameter is silently stripped** by Zod parse:

| Missing Parameter | Impact |
|---|---|
| `temperature`, `top_p` | No sampling control |
| `max_tokens` | No output length limit |
| `stop` | No stop sequences |
| `tools`, `tool_choice` | **No function/tool calling** |
| `response_format` | No JSON mode |
| `n` | No multi-completion |
| `stream_options` (include_usage) | No token counting in streams |
| `seed` | No reproducibility |
| `user` | No abuse tracking |

**Message schema**: Only `{ role: string, content: string }`. Missing: `name`, array content parts (vision/image_url), `tool_calls`, `tool_call_id`, `refusal`.

**Impact**: Any client using tool calling, JSON mode, temperature tuning, or vision sends requests that silently lose functionality. The proxy claims OpenAI compatibility but strips the majority of the API surface.

### 2.2 SQL Injection (T036) — **CRITICAL**

**File**: `packages/backend/src/proxy/logger.ts` (line 68)

```typescript
sql.raw(String(this.retentionDays))
```

String interpolation directly into SQL. If `retentionDays` is externally controllable (env var → config), this is a direct injection vector. Even if currently only set via env, defensive coding demands parameterized queries.

**Fix**: Use Drizzle's parameterized query API instead of `sql.raw()`.

### 2.3 Provider Error Leaking (T037) — **HIGH**

**File**: `packages/backend/src/proxy/handler.ts`

Raw upstream error messages forwarded to clients in error responses. Leaks provider details, internal URLs, API key fragments, and stack traces to end users.

### 2.4 Ephemeral Encryption Key — **HIGH**

**File**: `packages/backend/src/proxy/encryption.ts`

When `ENCRYPTION_KEY` env var is missing, a random AES-256-GCM key is generated at startup. All encrypted data (provider API keys stored in SQLite) becomes **permanently undecryptable after restart**. This is a silent data-loss trap.

### 2.5 URL Path Incompatibility — **HIGH**

**File**: `packages/backend/src/proxy/proxy.ts`

Route pattern: `/:endpointPath/chat/completions`  
OpenAI standard: `/v1/chat/completions`

The `:endpointPath` segment breaks direct SDK compatibility. Clients must know and specify the endpoint path, defeating the purpose of an OpenAI-compatible proxy.

---

## 3. Security Issues

| ID | Issue | Severity | File |
|---|---|---|---|
| T036 | SQL injection in log purge | Critical | logger.ts:68 |
| T037 | Provider errors leak to clients | High | handler.ts |
| T038 | Auth token in localStorage (XSS vector) | Medium | frontend auth |
| T042 | Admin token logged to stdout | Medium | auth middleware |
| T044 | No CORS configuration | Medium | server.ts |
| T077 | Server binds all interfaces | Medium | Docker/config |
| T078 | Encryption key in env var | Low | encryption.ts |
| T081 | No .dockerignore | Low | Dockerfile |
| T041 | Fixed key file permissions not enforced | Low | encryption.ts |
| T070 | Anthropic apiKey undefined when no overrides | Medium | anthropic/adapter.ts |

### Auth Architecture Concerns

- Single static Bearer token for proxy auth — no rotation, no scoping, no expiry
- Admin token for tRPC API is separate but also static
- `checkFirstRun()` runs on every request (T057) — no caching, DB hit every call
- `customFetch` swallows non-401 errors (T069) — masked auth failures
- Inconsistent auth parsing (T061) — different code paths parse auth header differently

---

## 4. Type Safety Issues

| ID | Issue | Location |
|---|---|---|
| T040 | Unsafe role cast: `messages as Array<{ role: "system"\|"user"\|"assistant"; content: string }>` | proxy.ts:127 |
| T045 | `useParams` with non-null assertion | frontend |
| T046 | Unsafe type casts throughout | multiple |
| T052 | Type confusion in error handling | handler.ts |
| T055 | Non-null assertions in log formatting | logger.ts |
| T068 | Error typed as `any` | service files |
| T070 | `overrides?.apiKey as string` — undefined when no overrides | anthropic/adapter.ts |

**Pattern**: The codebase uses `as` casts and `!` assertions instead of proper type guards. This moves runtime errors from compile-time (caught by TS) to runtime (crashes in production).

---

## 5. Code Quality Issues

### 5.1 Blocking the Event Loop

**Files**: `provider/service.ts`, `endpoint/service.ts`, `model/service.ts` (T048)

Async functions use Drizzle `.run()` — synchronous DB calls that block the Bun event loop. Under concurrent load, this serializes all DB operations.

**Fix**: Use async Drizzle API (`db.insert()`, `db.update()`, etc.) which are already available.

### 5.2 Stringly-Typed Errors

Services throw `new Error("DUPLICATE_PATH")`, `new Error("NOT_FOUND")`, `new Error("FORBIDDEN")`. No typed error hierarchy. Callers must match on `error.message` strings — fragile, typo-prone, untypeable.

### 5.3 Non-Null Assertions

`row.id!`, `.get()!` throughout service files. If the DB query returns no result, these throw at runtime instead of failing with a typed error.

### 5.4 N+1 Queries (T049)

Endpoint listing queries endpoint rows, then loops to count models per endpoint — one query per endpoint instead of a JOIN.

### 5.5 Module-Level Side Effects (T051)

Some modules execute logic at import time (e.g., `console.log` in tRPC middleware). Importing for testing triggers these side effects.

### 5.6 Custom Error Codes Not in OpenAI Spec

`model_not_found`, `all_providers_failed`, `internal_error` — these don't match any OpenAI error code. Clients coded against the OpenAI spec won't handle them.

---

## 6. Response Format Gaps

**File**: `packages/backend/src/proxy/formatter.ts`

| Field | OpenAI Spec | rel-ai Implementation |
|---|---|---|
| `finish_reason` | Enum: stop/length/tool_calls/content_filter | Always "stop" |
| `delta` (stream) | Typed: role/content/tool_calls/refusal | `Record<string, string>` (too loose) |
| `message.tool_calls` | Tool call objects | Never included |
| `message.refusal` | String or null | Never included |
| `system_fingerprint` | String | Never included |
| `service_tier` | String | Never included |
| `completion_tokens_details` | Object | Never included |
| `prompt_tokens_details` | Object | Never included |
| `owned_by` (models) | Actual provider org | Always "rel-ai" |

---

## 7. Streaming Issues

| ID | Issue |
|---|---|
| T054 | No upstream abort — if client disconnects, upstream request continues consuming resources |
| T064 | No graceful shutdown — in-flight requests terminated abruptly |
| T071 | Reader not cancelled on error — resource leak |
| T072 | Sync catch only handles synchronous errors — async rejections in stream pipeline unhandled |

---

## 8. Test Quality Assessment

### Summary Statistics

| Category | Files | Test Cases | Rating |
|---|---|---|---|
| Shared (schema tests) | 6 | ~52 | WORTHLESS–SHALLOW |
| Backend unit | 11 | ~80+ | Mixed |
| Frontend unit | 17 | ~50+ | Mostly SHALLOW |
| E2E/Integration | 0 | 0 | **NONE** |
| **Total** | ~34 | ~180+ | |

### WORTHLESS Tests (Delete)

These test Zod/React/Bun framework behavior, not application logic:

| File | Cases | Why Worthless |
|---|---|---|
| `shared/schemas/__tests__/enums.test.ts` | 5 | Tests Zod enum accepts/rejects string literals |
| `shared/schemas/__tests__/auth-token.test.ts` | 6 | Tests Zod schema parse/reject |
| `shared/schemas/__tests__/provider.test.ts` | 9 | Tests Zod rejects wrong type/UUID/URL/adapterType |

### SHALLOW Tests (Rewrite or Expand)

These touch app code but with heavy mocking, no real logic flow:

| File | Cases | Why Shallow |
|---|---|---|
| `shared/schemas/__tests__/request-log.test.ts` | 9 | Mostly Zod rejects; minor app constraints tested |
| `shared/schemas/__tests__/endpoint.test.ts` | 9 | Path validation rules are app-defined but tested at schema level only |
| `shared/schemas/__tests__/model.test.ts` | 14 | Discriminated union has some semantics but just schema.parse() |
| `frontend/features/auth/__tests__/auth.test.tsx` | 4 | Logout test directly calls localStorage mock, not provider logic |
| Various frontend feature tests | ~40 | Heavy MSW/tRPC mocking, shallow render testing |

### MEANINGFUL Tests (Keep/Extend)

| File | Cases | Why Meaningful |
|---|---|---|
| `frontend/features/auth/__tests__/login.test.tsx` | 4 | Tests login flow: validation, success+nav, failure+error display |
| `backend/proxy/__tests__/handler.test.ts` | ~15 | Tests fallback logic, error handling paths |
| `backend/proxy/__tests__/resolver.test.ts` | ~10 | Tests virtual model resolution rules |
| `backend/proxy/__tests__/adapter-registry.test.ts` | ~8 | Tests adapter lookup and registration |

### Missing Test Coverage — **CRITICAL**

| Module | Tests | Risk |
|---|---|---|
| `provider/service.ts` | **NONE** | CRUD for providers — no validation/error tests |
| `endpoint/service.ts` | **NONE** | CRUD for endpoints — stringly-typed errors untested |
| `model/service.ts` | **NONE** | CRUD for models — sync DB calls untested |
| `proxy/formatter.ts` | Partial | Response format edge cases untested |
| `proxy/encryption.ts` | Partial | Key rotation/wrong-key scenarios untested |
| `proxy/logger.ts` | Partial | SQL injection not tested, purge logic untested |
| SSE streaming pipeline | **NONE** | No end-to-end SSE tests at all |
| Error response format | **NONE** | Custom error codes untested |
| Admin API (tRPC) | **NONE** | Full CRUD API surface with zero tests |
| Docker build/deploy | **NONE** | No infrastructure tests |

---

## 9. Infrastructure Issues

| ID | Issue |
|---|---|
| T043 | Docker image not pinned — `FROM bun:latest` builds are non-reproducible |
| T076 | No healthcheck in Docker Compose |
| T079 | Docker build swallows install errors (`|| true`) |
| T080 | No NODE_ENV set in Docker |
| T082 | No Docker logging configuration |
| T083 | Frontend package.json misconfiguration |
| T084 | No CI lockfile enforcement |
| T085 | No concurrent request guard (race conditions in first-run setup) |

---

## 10. Frontend Issues

| ID | Issue |
|---|---|
| T059 | Redirect race condition on auth check |
| T067 | Auth state stored as plain JSON object |
| T073 | Stale cache in query invalidation |
| T074 | Background refetch causes UI flicker |

Frontend has thin test coverage and several race condition / state management issues in auth flow.

---

## 11. Priority Recommendations

### P0 — Fix Before Any Production Use

1. **T036**: Replace `sql.raw()` with parameterized query in logger.ts
2. **T037**: Sanitize provider errors before sending to clients
3. **T039**: Expand `ChatCompletionSchema` to accept (and forward) all OpenAI params
4. **Ephemeral key**: Fail fast at startup if `ENCRYPTION_KEY` missing — never silently generate
5. **T070**: Validate `apiKey` exists before casting to string in Anthropic adapter

### P1 — Fix Before Public API Exposure

6. **T044**: Add CORS configuration
7. **T038**: Move auth tokens from localStorage to httpOnly cookies
8. **T042**: Stop logging admin tokens to stdout
9. **T040**: Replace unsafe role cast with type guard
10. **T048**: Replace sync `.run()` with async Drizzle API
11. **T054**: Abort upstream request on client disconnect

### P2 — Fix Before Scale

12. **T049**: Replace N+1 with JOIN queries
13. **Stringly-typed errors**: Create `AppError` hierarchy with typed codes
14. **Non-null assertions**: Replace with null checks + typed errors
15. **Response format**: Add proper `finish_reason` enum, typed delta, missing fields
16. **T057**: Cache `checkFirstRun()` result
17. **T064**: Graceful shutdown with in-flight request draining

### P3 — Hardening

18. **T043**: Pin Docker base image version
19. **T076**: Add Docker healthcheck
20. **Test coverage**: Delete worthless schema tests, add service-layer and integration tests
21. **T061**: Unify auth header parsing
22. **Streaming**: Add E2E SSE tests, fix async error handling (T072), cancel reader on error (T071)

---

## 12. Tickets Summary

| Status | Count |
|---|---|
| Done (T001–T034) | 33 |
| Active (T033–T088) | 56 |
| **Total** | 89 (some numbering gaps) |

All sampled active tickets verified as still-present issues. None found to be already resolved.

### Active Tickets by Category

- **Security**: T036, T037, T038, T040, T041, T042, T043, T044, T060, T070, T077, T078, T081
- **OpenAI Compat**: T039, T056
- **Type Safety**: T045, T046, T052, T055, T068
- **Code Quality**: T047, T048, T049, T050, T051, T053, T057, T062, T063, T065, T066, T069, T072, T075, T085
- **Streaming**: T054, T064, T071
- **Frontend**: T059, T067, T073, T074
- **Docker/Infra**: T043, T076, T079, T080, T082, T083, T084
- **Feature Requests**: T086, T087, T088

---

*End of review.*
