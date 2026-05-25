import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { Hono } from "hono";
import { createMemoryDb } from "../../src/db/connection.js";
import { endpoints } from "../../src/db/schema/endpoints.js";
import { endpointModels } from "../../src/db/schema/endpoint_models.js";
import { models } from "../../src/db/schema/models.js";
import { providers } from "../../src/db/schema/providers.js";
import { hashToken } from "../../src/core/auth/token.js";
import { resetEncryptionKey, encrypt } from "../../src/core/auth/encryption.js";
import { createProxyRouter } from "../../src/routes/proxy.js";
import { ProxyHandler } from "../../src/core/proxy/handler.js";
import { ModelResolver } from "../../src/core/model/resolver.js";
import { AdapterRegistry } from "../../src/core/provider/registry.js";
import { OpenAIAdapter } from "../../src/adapters/openai/adapter.js";
import { AnthropicAdapter } from "../../src/adapters/anthropic/adapter.js";
import type { Model, Provider } from "@rel-ai/shared";
import type { DbClient } from "../../src/db/connection.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

// --- Fixtures ---

const TEST_TOKEN = "test-bearer-token-abc123";
const ENDPOINT_PATH = "test-ep";

// --- Helpers ---

function seedDb(db: DbClient, overrides?: { providerApiKey?: string }) {
  const providerId = crypto.randomUUID();
  const rawApiKey = overrides?.providerApiKey ?? "sk-test-real-key";

  db.insert(providers)
    .values({
      id: providerId,
      name: "Test OpenAI",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: rawApiKey,
      enabled: true,
    })
    .run();

  const modelId = "gpt-4";
  db.insert(models)
    .values({
      id: modelId,
      displayName: "GPT-4",
      type: "real",
      providerId,
      providerModel: "gpt-4",
    })
    .run();

  const endpointId = crypto.randomUUID();
  return { providerId, modelId, endpointId };
}

async function seedEndpoint(db: DbClient, endpointId: string, modelId: string) {
  const hash = await hashToken(TEST_TOKEN);
  db.insert(endpoints)
    .values({
      id: endpointId,
      name: "Test Endpoint",
      path: ENDPOINT_PATH,
      tokenHash: hash,
      enabled: true,
    })
    .run();

  db.insert(endpointModels)
    .values({
      endpointId,
      modelId,
    })
    .run();
}

function createTestApp(
  db: DbClient,
  fetchFn?: typeof globalThis.fetch,
  timeout?: number,
) {
  const modelId = "gpt-4";
  const providerId = db.select().from(models).where().all()[0]?.providerId ?? "";
  const providerRow = db.select().from(providers).where().all().find((p) => p.id === providerId);

  const modelMap = new Map<string, Model>();
  const providerMap = new Map<string, Provider>();

  // Load from DB
  for (const row of db.select().from(models).all()) {
    if (row.type === "real") {
      modelMap.set(row.id, {
        id: row.id,
        displayName: row.displayName,
        providerId: row.providerId!,
        providerModel: row.providerModel!,
        type: "real",
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });
    }
  }

  for (const row of db.select().from(providers).all()) {
    providerMap.set(row.id, {
      id: row.id,
      name: row.name,
      adapterType: row.adapterType as "openai" | "anthropic" | "custom",
      baseUrl: row.baseUrl,
      apiKey: row.apiKey, // may be encrypted
      enabled: row.enabled,
      config: row.config ? JSON.parse(row.config) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  const resolver = new ModelResolver({
    getModel: (id) => modelMap.get(id),
    getProvider: (id) => providerMap.get(id),
  });

  const registry = new AdapterRegistry();
  registry.register(new OpenAIAdapter());
  registry.register(new AnthropicAdapter());

  // Mock provider credentials — return the actual key from provider record
  async function getProviderCredentials(pid: string) {
    const p = providerMap.get(pid);
    if (!p) return null;
    // If it looks encrypted (contains colon), try decrypt; otherwise use as-is
    let apiKey = p.apiKey;
    if (apiKey.includes(":")) {
      try {
        apiKey = await decrypt(apiKey);
      } catch {
        // Use as-is if decrypt fails
      }
    }
    return { baseUrl: p.baseUrl, apiKey };
  }

  const handler = new ProxyHandler({
    resolver,
    registry,
    getProviderCredentials,
    fetchFn: fetchFn ?? (() => Promise.resolve(new Response("not found", { status: 404 }))),
    timeout,
  });

  const proxyRouter = createProxyRouter(db, handler);

  const app = new Hono();
  app.route("/v1", proxyRouter);

  return app;
}

function createCapturingApp(db: DbClient) {
  let capturedRequest: ProxyRequest | undefined;

  const modelId = "gpt-4";
  const providerId = db.select().from(models).where().all()[0]?.providerId ?? "";
  const providerRow = db.select().from(providers).where().all().find((p) => p.id === providerId);

  const modelMap = new Map<string, Model>();
  const providerMap = new Map<string, Provider>();

  for (const row of db.select().from(models).all()) {
    if (row.type === "real") {
      modelMap.set(row.id, {
        id: row.id,
        displayName: row.displayName,
        providerId: row.providerId!,
        providerModel: row.providerModel!,
        type: "real",
        createdAt: new Date(row.createdAt),
        updatedAt: new Date(row.updatedAt),
      });
    }
  }

  for (const row of db.select().from(providers).all()) {
    providerMap.set(row.id, {
      id: row.id,
      name: row.name,
      adapterType: row.adapterType as "openai" | "anthropic" | "custom",
      baseUrl: row.baseUrl,
      apiKey: row.apiKey,
      enabled: row.enabled,
      config: row.config ? JSON.parse(row.config) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    });
  }

  const resolver = new ModelResolver({
    getModel: (id) => modelMap.get(id),
    getProvider: (id) => providerMap.get(id),
  });

  const registry = new AdapterRegistry();
  registry.register(new OpenAIAdapter());
  registry.register(new AnthropicAdapter());

  async function getProviderCredentials(pid: string) {
    const p = providerMap.get(pid);
    if (!p) return null;
    let apiKey = p.apiKey;
    if (apiKey.includes(":")) {
      try {
        apiKey = await decrypt(apiKey);
      } catch {
        // Use as-is if decrypt fails
      }
    }
    return { baseUrl: p.baseUrl, apiKey };
  }

  const handler = new ProxyHandler({
    resolver,
    registry,
    getProviderCredentials,
    fetchFn: (() => Promise.resolve(new Response("not found", { status: 404 }))) as unknown as typeof fetch,
  });

  // Wrap handler.handle to capture the request
  const originalHandle = handler.handle.bind(handler);
  handler.handle = async (req: ProxyRequest) => {
    capturedRequest = req;
    return originalHandle(req);
  };

  const proxyRouter = createProxyRouter(db, handler);

  const app = new Hono();
  app.route("/v1", proxyRouter);

  return { app, getCapturedRequest: () => capturedRequest };
}

// --- Tests ---

describe("Proxy Routes", () => {
  let db: DbClient;
  let endpointId: string;
  let modelId: string;
  let providerId: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    const seed = seedDb(db);
    endpointId = seed.endpointId;
    modelId = seed.modelId;
    providerId = seed.providerId;
    await seedEndpoint(db, endpointId, modelId);
  });

  describe("POST /v1/:endpointPath/chat/completions", () => {
    test("valid non-streaming request → JSON response", async () => {
      const mockFetch = (() => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "chatcmpl-test",
              object: "chat.completion",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "Hello!" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.object).toBe("chat.completion");
      expect(res.headers.get("X-Request-Id")).toBeDefined();
      expect(res.headers.get("Content-Type")).toContain("application/json");
    });

    test("valid streaming request → SSE response", async () => {
      const sseBody = [
        'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
        "data: [DONE]\n\n",
      ].join("");

      const mockFetch = (() => {
        return Promise.resolve(
          new Response(sseBody, {
            headers: { "Content-Type": "text/event-stream" },
          }),
        );
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: true,
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("X-Request-Id")).toBeDefined();
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");

      const text = await res.text();
      expect(text).toContain("chat.completion.chunk");
      expect(text).toContain("[DONE]");
    });

    test("missing authorization → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("unauthorized");
    });

    test("invalid token → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: "Bearer wrong-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("unauthorized");
    });

    test("unknown endpoint path → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request("/v1/nonexistent/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(401);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("unauthorized");
    });

    test("unknown model → 404", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "nonexistent-model",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(404);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("model_not_found");
    });

    test("request body validation: missing model → 400", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("validation_error");
    });

    test("request body validation: empty messages → 400", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [],
          stream: false,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("validation_error");
    });

    test("request body validation: invalid JSON → 400", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: "not-json",
      });

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("invalid_json");
    });

    test("stream defaults to true when omitted", async () => {
      const sseBody = [
        'data: {"id":"chatcmpl-test","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}\n\n',
        "data: [DONE]\n\n",
      ].join("");

      const mockFetch = (() => {
        return Promise.resolve(
          new Response(sseBody, {
            headers: { "Content-Type": "text/event-stream" },
          }),
        );
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          // stream omitted — defaults to true
        }),
      });

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    });

    test("provider error → 502", async () => {
      // Network error from fetch
      const mockFetch = (() => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(502);
    });

    test("provider timeout → 504", async () => {
      const mockFetch = ((url: string | URL | Request, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              reject(new DOMException("The operation was aborted.", "AbortError"));
            });
          }
        });
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch, 50); // 50ms timeout

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(504);
    });

    test("invalid auth scheme → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(401);
    });

    test("valid roles (system, user, assistant) pass validation", async () => {
      const mockFetch = (() => {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "chatcmpl-test",
              object: "chat.completion",
              choices: [
                {
                  index: 0,
                  message: { role: "assistant", content: "Hi" },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      }) as unknown as typeof fetch;

      const app = createTestApp(db, mockFetch);

      for (const role of ["system", "user", "assistant"] as const) {
        const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${TEST_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4",
            messages: [{ role, content: "Hello" }],
            stream: false,
          }),
        });
        expect(res.status).toBe(200);
      }
    });

    test("invalid role rejected with validation error", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "invalid", content: "Hi" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("validation_error");
    });

    test("role 'tool' rejected with validation error", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "tool", content: "result" }],
          stream: false,
        }),
      });

      expect(res.status).toBe(400);
      const body = await res.json() as Record<string, unknown>;
      expect((body.error as Record<string, unknown>).code).toBe("validation_error");
    });
  });

  describe("GET /v1/:endpointPath/models", () => {
    test("returns OpenAI-format models list", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/models`, {
        headers: {
          Authorization: `Bearer ${TEST_TOKEN}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json() as Record<string, unknown>;
      expect(body.object).toBe("list");
      const data = body.data as Array<Record<string, unknown>>;
      expect(data.length).toBeGreaterThanOrEqual(1);
      expect(data[0]!.object).toBe("model");
      expect(data[0]!.id).toBeDefined();
      expect(data[0]!.owned_by).toBe("rel-ai");
    });

    test("missing auth → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/models`);

      expect(res.status).toBe(401);
    });

    test("invalid token → 401", async () => {
      const app = createTestApp(db);

      const res = await app.request(`/v1/${ENDPOINT_PATH}/models`, {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
