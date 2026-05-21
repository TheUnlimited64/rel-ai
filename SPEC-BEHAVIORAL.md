# RelAI v2 — Behavioral Specification

## Purpose

RelAI is an LLM proxy that lets users manage multiple AI providers through a single unified interface. It exposes OpenAI-compatible endpoints with flexible model routing, automatic fallback on failures, and parameter-tuned virtual models. A web admin UI handles all configuration.

## User Personas

- **Homelab operator** — runs the proxy via Docker Compose on a home server. Connects AI tools (agents, chat apps) to the proxy instead of directly to providers.
- **AI tool / agent** — consumes the proxy's OpenAI-compatible API. Unaware that requests are being proxied, fallback-chained, or parameter-overridden.

## User Stories

### Providers

- As an operator, I want to add an LLM provider by specifying its name, API endpoint, API key, and adapter type (OpenAI-compatible, Anthropic, or custom) so the proxy can route requests to it.
- As an operator, I want to list all configured providers and see their name, type, base URL, and enabled status.
- As an operator, I want to edit a provider's configuration (change API key, URL, etc.) without deleting and recreating it.
- As an operator, I want to disable a provider temporarily so requests won't route to it, without losing its configuration.
- As an operator, I want to delete a provider. I expect a warning if any models still reference it.
- As an operator, I want to test a provider's connection so I can verify my API key and URL are correct before relying on it.

### Models

- As an operator, I want to define a **real model** that maps an internal model ID to a specific model at a specific provider (e.g., `deepseek_v4_flash` → DeepSeek's `deepseek-chat`).
- As an operator, I want to define a **virtual fallback model** — an ordered list of real models. When AI tools request this model, the proxy tries each in order. If the first hits a rate limit or error, it automatically tries the next.
- As an operator, I want to define a **virtual tuned model** — a real model with parameter overrides. For example, `deepseek_v4_flash_high` uses DeepSeek's flash model but forces `thinking_effort: "high"`.
- As an operator, I want to test model resolution (dry-run) to see which provider and model the proxy would actually use, including following fallback chains.
- As an operator, I want to see a clear error when I create a circular fallback chain (model A falls back to B, B falls back to A).
- As an operator, I want to see a clear error when I delete a model that other virtual models depend on, telling me which models depend on it.

### Endpoints

- As an operator, I want to create an **endpoint** — a named proxy route with its own bearer token and a set of available models.
- As an operator, I want each endpoint to have a unique URL path (e.g., `/agents`, `/chat`) that AI tools can hit as `POST /v1/{path}/chat/completions`.
- As an operator, I want each endpoint to have its own bearer token so I can revoke access per-endpoint without affecting others.
- As an operator, I want to regenerate an endpoint's bearer token (old token immediately invalid).
- As an operator, I want to control which models are available on each endpoint. An endpoint only exposes the models I assign to it.
- As an operator, I want to disable an endpoint temporarily without deleting it.
- As an operator, I want to see the full proxy URL for an endpoint after creating it, ready to copy into my AI tools.

### Proxy Behavior

- As an AI tool, I want to send OpenAI-compatible `chat/completions` requests to the proxy and receive OpenAI-compatible responses, regardless of which provider is actually handling the request.
- As an AI tool, I want streaming responses via SSE when I set `stream: true`. The SSE format must match OpenAI's format exactly.
- As an AI tool, I want to list available models for an endpoint via `GET /v1/{path}/models` in OpenAI format.
- As an operator, when a virtual model has a fallback chain and the primary provider is rate-limited, I want the proxy to automatically try the next provider in the chain — **before** any content is streamed to the client.
- As an operator, if a provider fails mid-stream after content has already been sent to the client, I accept that the stream terminates with an error (no replay or retry of already-sent content).
- As an operator, I want providers that recently failed rate-limit checks to be temporarily marked unhealthy so the proxy skips them in fallback chains (instead of hitting them again). After a cooldown period, they should be retried.

### Authentication & Security

- As an operator, I want to generate admin API tokens in the UI to authenticate to the management interface.
- As an operator, I want to see a token only once at creation time — after that, only a hash is stored. If I lose it, I generate a new one.
- As an operator, I want provider API keys encrypted at rest in the database, not stored in plaintext.
- As an operator, I want each endpoint to authenticate via its own bearer token, independent of admin tokens.

### Request Logging & Monitoring

- As an operator, I want every proxied request logged with: timestamp, endpoint, model requested, resolved model, provider used, prompt/completion token counts, latency, and status (success/error/rate-limited).
- As an operator, I want to view request logs in the admin UI, filtered by endpoint, provider, status, or date range.
- As an operator, I want to see aggregate stats: total requests, success rate, average latency, total tokens used, broken down by provider and model.
- As an operator, I want old logs automatically purged after a configurable retention period (default: 30 days).

### First-Run Experience

- As an operator, on first launch with an empty database, I want the system to auto-generate an initial admin token and print it to the console so I can log in immediately.
- As an operator, when I first open the admin UI with no configuration, I want a guided setup wizard: add first provider → add first model → create first endpoint → get my proxy URL.

### Deployment

- As an operator, I want to deploy the entire system with a single `docker compose up` command.
- As an operator, I want the admin UI and proxy API served on the same port (no separate frontend container).
- As an operator, I want my data (SQLite database) persisted on a Docker volume so it survives container restarts.
- As an operator, I want a health check endpoint (`GET /health`) for monitoring.

### Extensibility

- As an operator, I want to add custom provider adapters in the future without modifying the proxy core — by implementing a known interface and registering it.
- As a developer, I want a template and guide for creating new provider adapters so I can add support for providers with non-standard APIs.

## Behavioral Contracts

### Proxy API Contract (OpenAI-Compatible)

All proxy endpoints accept and return OpenAI-compatible request/response shapes, regardless of the upstream provider.

**Request:** `POST /v1/{endpoint-path}/chat/completions`

```json
{
  "model": "my-virtual-model",
  "messages": [{ "role": "user", "content": "Hello" }],
  "stream": true
}
```

**Streaming response:** SSE with OpenAI chunk format, terminated by `data: [DONE]`.

**Non-streaming response:** OpenAI completion object.

**Error response:** OpenAI error format:

```json
{
  "error": {
    "message": "Human-readable description",
    "type": "upstream_error | auth_error | not_found | timeout",
    "code": "rate_limit | invalid_token | model_not_found | timeout"
  }
}
```

| HTTP Status | When |
|-------------|------|
| 401 | Missing or invalid bearer token |
| 404 | Endpoint or model not found |
| 429 | All providers in fallback chain rate-limited |
| 502 | Upstream provider error |
| 504 | Request to upstream timed out |

### Model Resolution Rules

1. **Real model** → resolve directly to `{ provider, providerModel, overrides }`
2. **Virtual tuned** → resolve base model (must be real or another tuned), merge overrides (tuned overrides take precedence)
3. **Virtual fallback** → iterate chain in order, skip providers marked unhealthy, return first healthy resolution
4. **Circular chains** → detect and reject at configuration time, not runtime
5. **Unhealthy providers** → marked unhealthy for a cooldown period (default 60s) after rate-limit or connection failure
6. **All providers failed** → return error to client, no retry

### Model Override Merging

When a virtual tuned model specifies overrides and its base model also has overrides:
- Base model overrides apply first
- Tuned model overrides merge on top (tuned wins on conflicts)
- Example: base has `{ temperature: 0.7 }`, tuned has `{ thinking_effort: "high" }` → result is `{ temperature: 0.7, thinking_effort: "high" }`
- Example: base has `{ temperature: 0.7 }`, tuned has `{ temperature: 0.9 }` → result is `{ temperature: 0.9 }`

## Invariants

- An endpoint's model list only contains models that exist. Deleting a model removes it from all endpoint assignments.
- A virtual model's fallback chain only references models that exist. Updating a chain validates all references.
- A virtual tuned model's base model must be a real model or another tuned model (not a fallback model).
- Provider API keys are never returned in full by any API endpoint. They are encrypted at rest and masked in responses.
- Bearer tokens are shown exactly once at creation time. Only hashes are stored.
- The proxy always returns OpenAI-compatible response format, even when the upstream provider uses a different format.

## Out of Scope

- Multi-user / multi-tenant access control
- SSO / OIDC integration
- Request queuing / priority ordering
- Prompt templating or message transformation
- Token budget limits per endpoint
- Horizontal scaling / clustering
- Schema migration UI (migrations run on startup)
