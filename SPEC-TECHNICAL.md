# RelAI v2 — Technical Specification

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Backend Runtime | Bun | Native TS, fast, built-in SQLite driver, built-in test runner |
| Backend Framework | Hono | Lightweight, type-safe, Bun-native, SSE support |
| API Contract | tRPC + Zod | End-to-end type safety, shared types between FE/BE, compile-time contract validation |
| Database | SQLite (via Drizzle ORM) | Embedded, single-file, homelab-scale, version-controllable |
| ORM | Drizzle | Type-safe SQL, Zod schema inference, SQLite native |
| Frontend | Vite + React Router | SPA, fast HMR, route-based code splitting |
| UI Components | shadcn/ui | Copy-paste, accessible, Tailwind-based, fits 100-line limit |
| Styling | Tailwind CSS | Utility-first, pairs with shadcn |
| Testing (Unit/Integration) | Vitest | Fast, ESM-native, works for both FE and BE |
| Testing (E2E) | Playwright | Browser automation, integration testing |
| Auth | Bearer token (UI-generated) | Simple, homelab-appropriate |
| Deployment | Docker Compose | Homelab standard |

## Architecture

### High-Level

```
┌─────────────────────────────────────────────────┐
│                  Docker Compose                  │
│                                                  │
│  ┌──────────────┐      ┌──────────────────────┐ │
│  │  React SPA   │─────▶│  Bun/Hono Backend    │ │
│  │  (Vite)      │ tRPC │                      │ │
│  │              │◀─────│  ┌────────────────┐  │ │
│  └──────────────┘      │  │ Provider Layer │  │ │
│                        │  │                │  │ │
│                        │  │ ┌────────────┐ │  │ │
│                        │  │ │ OpenAI     │ │  │ │
│                        │  │ │ Adapter    │ │  │ │
│                        │  │ ├────────────┤ │  │ │
│                        │  │ │ Anthropic  │ │  │ │
│                        │  │ │ Adapter    │ │  │ │
│                        │  │ ├────────────┤ │  │ │
│                        │  │ │ Custom     │ │  │ │
│                        │  │ │ Adapter    │ │  │ │
│                        │  │ └────────────┘ │  │ │
│                        │  └────────────────┘  │ │
│                        │                      │ │
│                        │  ┌────────────────┐  │ │
│                        │  │ SQLite (Drizzle)│  │ │
│                        │  └────────────────┘  │ │
│                        └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Monorepo Layout

```
packages/
  shared/              # Shared types, Zod schemas
  backend/
    src/
      core/            # Framework-agnostic business logic
        provider/      # Provider adapter interface + registry
        model/         # Model resolution (real + virtual)
        proxy/         # Request proxying, SSE streaming
        auth/          # Token generation, validation, encryption
        logging/       # Request logging, usage tracking
      adapters/
        openai/        # OpenAI-compatible adapter
        anthropic/     # Anthropic adapter
        custom/        # Custom adapter template
      db/
        schema/        # Drizzle schema definitions
        migrations/    # Drizzle migrations
      api/             # Hono routes, tRPC setup
    tests/
  frontend/
    src/
      features/        # Feature-based modules
        providers/
        endpoints/
        models/
        logs/
        auth/
      components/      # Shared UI components (shadcn)
      lib/             # Utilities, tRPC client
    tests/
```

### Frontend Feature Module Structure

```
features/{name}/
  components/    # React components (max 100 lines each)
  hooks/         # Feature-specific hooks
  types/         # Feature-specific types
  api.ts         # tRPC queries/mutations for this feature
  index.ts       # Public exports
```

## Shared Type Definitions (Zod Schemas)

All data shapes defined once in `packages/shared` as Zod schemas. Inferred TypeScript types used everywhere — no standalone interfaces.

### Provider

```typescript
const ProviderSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  adapterType: z.enum(["openai", "anthropic", "custom"]),
  baseUrl: z.string().url(),
  apiKey: z.string().min(1),
  enabled: z.boolean().default(true),
  config: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Endpoint

```typescript
const EndpointSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  path: z.string().regex(/^\/[a-z0-9-]+$/),
  token: z.string(),
  models: z.array(z.string()),
  enabled: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});
```

### Models (Discriminated Union)

```typescript
const RealModelSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  providerId: z.string().uuid(),
  providerModel: z.string().min(1),
  type: z.literal("real"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const VirtualModelSchema = z.object({
  id: z.string(),
  displayName: z.string().min(1),
  type: z.literal("virtual"),
  variant: z.enum(["fallback", "tuned"]),
  fallbackChain: z.array(z.string()).optional(),
  baseModelId: z.string().optional(),
  overrides: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const ModelSchema = z.discriminatedUnion("type", [
  RealModelSchema,
  VirtualModelSchema,
]);
```

### Request Log

```typescript
const RequestLogSchema = z.object({
  id: z.string().uuid(),
  endpointId: z.string().uuid(),
  requestedModel: z.string(),
  resolvedModel: z.string().optional(),
  providerId: z.string().uuid().optional(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  status: z.enum(["success", "error", "rate_limited"]),
  errorDetail: z.string().optional(),
  createdAt: z.date(),
});
```

### Auth Token

```typescript
const AuthTokenSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  tokenHash: z.string(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
});
```

### Input Variants

Each schema has a `CreateXSchema` variant (no `id`, `createdAt`, `updatedAt`) for input validation. Export alongside full schemas.

## Provider Adapter Interface

Framework-agnostic contract. Adapters are stateless — all context passed via params.

```typescript
interface ProviderAdapter {
  type: string;

  createRequest(params: {
    model: string;
    messages: Message[];
    stream: boolean;
    overrides?: Record<string, unknown>;
  }): { url: string; headers: Record<string, string>; body: unknown };

  parseSSEChunk(chunk: string): ParsedChunk | null;
  parseError(response: Response): ProviderError;
  isRateLimitError(error: ProviderError): boolean;
}

type ParsedChunk = {
  content?: string;
  thinking?: string;
  done: boolean;
  usage?: { promptTokens: number; completionTokens: number };
};

type ProviderError = {
  code: string;
  message: string;
  status: number;
  retryable: boolean;
};
```

### Adapter Registry

Simple map-based registry. No DI framework.

```typescript
class AdapterRegistry {
  register(adapter: ProviderAdapter): void;
  get(type: string): ProviderAdapter;       // throws if unknown
  has(type: string): boolean;
}
```

### OpenAI Adapter (`type: "openai"`)

- Request: `POST {baseUrl}/chat/completions`, `Authorization: Bearer {apiKey}`
- SSE: parses `data: {json}` lines, extracts `choices[0].delta.content`
- Thinking: DeepSeek `reasoning_content` field in delta
- Rate limit: HTTP 429

### Anthropic Adapter (`type: "anthropic"`)

- Request: `POST {baseUrl}/v1/messages`, `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`
- Message conversion: OpenAI `system` message → Anthropic `system` field
- SSE: parses `event: content_block_delta` (text_delta / thinking_delta)
- Required: `max_tokens` in body (default 4096)
- Rate limit: HTTP 429, `rate_limit_error` type

### Custom Adapter

Template implementing `ProviderAdapter` with stubs. Users implement the five methods and register. No core code changes needed.

## Model Resolution Engine

```typescript
type ResolvedModel = {
  providerId: string;
  providerModel: string;
  adapterType: string;
  overrides: Record<string, unknown>;
};

class ModelResolver {
  resolve(modelId: string): ResolvedModel;
  markUnhealthy(providerId: string, durationMs?: number): void;
  isHealthy(providerId: string): boolean;
}
```

**Resolution algorithm:**

1. Real model → `{ providerId, providerModel, overrides }`
2. Virtual tuned → resolve base model, deep-merge overrides (tuned wins conflicts)
3. Virtual fallback → iterate chain, skip unhealthy, return first healthy
4. Circular chain → detect at config time, throw `CircularDependencyError`
5. All unhealthy → throw `AllProvidersFailedError`

**Health tracking:** in-memory only (resets on restart). Default cooldown: 60s.

## SSE Proxy Handler

```typescript
class ProxyHandler {
  handle(request: ProxyRequest): ProxyResult;
}
```

- Uses `ModelResolver` → `AdapterRegistry` → `ProviderAdapter`
- For streaming: returns `ReadableStream` of OpenAI-format SSE chunks
- For non-streaming: returns complete OpenAI completion JSON
- All provider formats normalized to OpenAI output format via adapter's `parseSSEChunk`
- Passthrough: no buffering. Once streaming begins, no fallback retry.
- Fallback attempts only happen **before** streaming starts (resolution phase).
- Timeout: configurable, default 120s.
- Emits request log event on completion.

## tRPC API

### Router Structure

```
root
├── auth          # createToken, listTokens, deleteToken, login
├── providers     # create, list, get, update, delete, testConnection
├── endpoints     # create, list, get, update, delete, regenerateToken, getModels
├── models        # createReal, createVirtualFallback, createVirtualTuned,
│                 # list, get, update, delete, testResolution
└── logs          # list, stats, clear
```

### Procedure Builders

- **Public** procedure — no auth required (login only)
- **Protected** procedure — validates admin bearer token
- All procedures use Zod input validation
- Error formatter: never leak stack traces or internals

### tRPC Client (Frontend)

```typescript
// packages/frontend/src/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@rel-ai/backend/src/api/router";

const trpc = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});
```

## Database Schema (SQLite via Drizzle)

```sql
CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adapter_type TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,          -- AES-256-GCM encrypted
  enabled INTEGER NOT NULL DEFAULT 1,
  config TEXT,                    -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE models (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('real', 'virtual')),
  variant TEXT CHECK(variant IN ('fallback', 'tuned')),
  provider_id TEXT REFERENCES providers(id),
  provider_model TEXT,
  base_model_id TEXT REFERENCES models(id),
  fallback_chain TEXT,            -- JSON array of model IDs
  overrides TEXT,                 -- JSON
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE endpoints (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE endpoint_models (
  endpoint_id TEXT REFERENCES endpoints(id) ON DELETE CASCADE,
  model_id TEXT REFERENCES models(id) ON DELETE CASCADE,
  PRIMARY KEY (endpoint_id, model_id)
);

CREATE TABLE auth_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE TABLE request_logs (
  id TEXT PRIMARY KEY,
  endpoint_id TEXT REFERENCES endpoints(id),
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  provider_id TEXT REFERENCES providers(id),
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  status TEXT NOT NULL CHECK(status IN ('success', 'error', 'rate_limited')),
  error_detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_request_logs_endpoint ON request_logs(endpoint_id);
CREATE INDEX idx_request_logs_created ON request_logs(created_at);
CREATE INDEX idx_request_logs_provider ON request_logs(provider_id);
```

## Authentication Implementation

### Token Generation

- 32 bytes, hex-encoded (64 chars)
- Hashed with SHA-256 for storage
- Only full token returned once at creation

### API Key Encryption

- AES-256-GCM via Web Crypto API
- Key from `ENCRYPTION_KEY` env var
- Auto-generated on first run if missing (logged to stdout once)
- Encrypt in service layer before DB write; decrypt in service layer on read

### Route Protection

- Admin API: validate against `auth_tokens` table
- Proxy endpoints: validate against `endpoints.token_hash`
- Different token domains — admin token never works on proxy endpoints and vice versa

## Docker Compose

```yaml
services:
  rel-ai:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - rel-ai-data:/app/data
    environment:
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}

volumes:
  rel-ai-data:
```

- Single container: Bun serves backend + static frontend assets
- Hono `serveStatic` middleware for frontend
- DB file: `/app/data/rel-ai.db` on persistent volume
- Health check: `GET /health` → `{ status: "ok" }`
- Multi-stage Dockerfile: build FE → build BE → production image

## Design Constraints

| Constraint | Value | Rationale |
|-----------|-------|-----------|
| Max component lines | 100 | Readability, testability |
| Max function lines | 30 | Single responsibility |
| Max file lines | 300 | Navigability |
| Max function params | 3 | Use options object otherwise |
| Test coverage gate | 80% | TDD discipline |
| All Zod schemas shared | `packages/shared` | Single source of truth |
| Monorepo structure | Bun workspaces | Shared packages |
| No `any` | Strict TS | Compile-time safety |
| No runtime type casts | Use Zod parse | Validate boundaries |
| `noUncheckedIndexedAccess` | true | Catch undefined index access |

## Development Phases

| Phase | Focus | Tickets |
|-------|-------|---------|
| 1 — Foundation | Monorepo, shared schemas, DB, adapter interface | T001–T004 |
| 2 — Proxy Core | Adapters, model resolution, SSE proxy, tRPC APIs, auth, logging | T005–T016 |
| 3 — Admin UI | Frontend scaffold, CRUD UIs, auth flow | T017–T023 |
| 4 — Polish | Docker, E2E tests, custom adapters, startup wizard | T024–T028 |
