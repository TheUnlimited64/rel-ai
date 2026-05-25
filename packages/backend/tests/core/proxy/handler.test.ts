import { describe, expect, test, mock, beforeEach } from "bun:test";
import type { ProxyRequest, ProxyResult } from "../../../src/core/proxy/types.js";
import type { ProviderAdapter } from "../../../src/core/provider/adapter.js";
import type { ParsedChunk, ProviderError } from "../../../src/core/provider/types.js";
import { ProxyHandler } from "../../../src/core/proxy/handler.js";
import { ModelResolver } from "../../../src/core/model/resolver.js";
import { AdapterRegistry } from "../../../src/core/provider/registry.js";
import { AnthropicAdapter } from "../../../src/adapters/anthropic/adapter.js";
import type { Model, Provider } from "@rel-ai/shared";

// --- Fixtures ---

const providerOpenAI: Provider = {
  id: "p-openai",
  name: "OpenAI",
  adapterType: "openai",
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test",
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const providerAnthropic: Provider = {
  id: "p-anthropic",
  name: "Anthropic",
  adapterType: "anthropic",
  baseUrl: "https://api.anthropic.com",
  apiKey: "sk-ant-test",
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const realModelOpenAI: Model = {
  id: "gpt-4",
  displayName: "GPT-4",
  providerId: "p-openai",
  providerModel: "gpt-4",
  type: "real",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const realModelAnthropic: Model = {
  id: "claude-3",
  displayName: "Claude 3",
  providerId: "p-anthropic",
  providerModel: "claude-3-sonnet",
  type: "real",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fallbackModel: Model = {
  id: "fallback-model",
  displayName: "Fallback",
  type: "virtual",
  variant: "fallback",
  fallbackChain: ["gpt-4", "claude-3"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// --- Helpers ---

function buildResolver(models: Model[] = [], providers: Provider[] = []) {
  const modelMap = new Map(models.map((m) => [m.id, m]));
  const providerMap = new Map(providers.map((p) => [p.id, p]));
  return new ModelResolver({
    getModel: (id: string) => modelMap.get(id),
    getProvider: (id: string) => providerMap.get(id),
    unhealthyDuration: 60_000,
  });
}

function buildHandler(
  models: Model[],
  providers: Provider[],
  fetchFn?: typeof fetch,
  onLog?: (log: unknown) => void,
  timeout?: number,
): ProxyHandler {
  const resolver = buildResolver(models, providers);
  const registry = new AdapterRegistry();

  // Register OpenAI mock adapter
  const openaiAdapter = createOpenAIMockAdapter();
  const anthropicAdapter = new AnthropicAdapter();

  registry.register(openaiAdapter);
  registry.register(anthropicAdapter);

  return new ProxyHandler({
    resolver,
    registry,
    fetchFn: fetchFn ?? (() => Promise.resolve(new Response())),
    onLog: onLog ?? (() => {}),
    getProviderCredentials: (providerId: string) => {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return Promise.resolve(null);
      return Promise.resolve({
        baseUrl: provider.baseUrl,
        apiKey: provider.apiKey,
      });
    },
    timeout,
  });
}

function createOpenAIMockAdapter(): ProviderAdapter {
  return {
    type: "openai",
    createRequest(params) {
      return {
        url: "https://api.openai.com/v1/chat/completions",
        headers: {
          Authorization: "Bearer sk-test",
          "Content-Type": "application/json",
        },
        body: {
          model: params.model,
          messages: params.messages,
          stream: params.stream,
          ...params.overrides,
        },
      };
    },
    parseSSEChunk(chunk: string): ParsedChunk | null {
      let content: string | undefined;
      let done = false;
      let usage: { promptTokens: number; completionTokens: number } | undefined;

      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          done = true;
          continue;
        }
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          const choices = parsed.choices as Array<Record<string, unknown>> | undefined;
          if (choices?.[0]) {
            const delta = choices[0].delta as Record<string, unknown> | undefined;
            if (delta?.content) content = (content ?? "") + (delta.content as string);
          }
          if (parsed.usage && typeof parsed.usage === "object") {
            const u = parsed.usage as Record<string, unknown>;
            usage = { promptTokens: (u.prompt_tokens as number) ?? 0, completionTokens: (u.completion_tokens as number) ?? 0 };
          }
        } catch {
          continue;
        }
      }

      if (!content && !done && !usage) return null;
      return { ...(content !== undefined ? { content } : {}), done, ...(usage ? { usage } : {}) };
    },
    async parseError(response: Response): Promise<ProviderError> {
      try {
        const body = (await response.json()) as Record<string, unknown>;
        const error = (body.error ?? {}) as Record<string, unknown>;
        return {
          code: (error.code as string) ?? "UNKNOWN",
          message: (error.message as string) ?? "Unknown error",
          status: response.status,
          retryable: response.status >= 500,
        };
      } catch {
        return {
          code: "UNKNOWN",
          message: `HTTP ${response.status}`,
          status: response.status,
          retryable: response.status >= 500,
        };
      }
    },
    isRateLimitError(error: ProviderError): boolean {
      return error.status === 429;
    },
  };
}

function createMockFetch(responses: Response[]): typeof fetch {
  let idx = 0;
  return (() => {
    const r = responses[idx++];
    if (!r) throw new Error("No more mock responses");
    return Promise.resolve(r);
  }) as unknown as typeof fetch;
}

function openAIStreamChunks(chunks: Array<{ content?: string; done?: boolean }>): Response {
  const parts = chunks.map((c) => {
    if (c.done) return "data: [DONE]\n\n";
    return `data: ${JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion.chunk",
      choices: [{ index: 0, delta: { content: c.content ?? "" } }],
    })}\n\n`;
  });

  const body = parts.join("");
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function openAICompletion(content: string, promptTokens = 10, completionTokens = 20): Response {
  return new Response(
    JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
      usage: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

function anthropicStreamChunks(chunks: Array<{ type: string; text?: string; thinking?: string }>): Response {
  const parts = chunks.map((c) => {
    if (c.type === "message_start") {
      return `event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test","type":"message","role":"assistant","usage":{"input_tokens":10,"output_tokens":0}}}\n\n`;
    }
    if (c.type === "content_block_delta" && c.thinking) {
      return `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"${c.thinking}"}}\n\n`;
    }
    if (c.type === "content_block_delta" && c.text) {
      return `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${c.text}"}}\n\n`;
    }
    if (c.type === "message_delta") {
      return `event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":15}}\n\n`;
    }
    if (c.type === "message_stop") {
      return `event: message_stop\ndata: {"type":"message_stop"}\n\n`;
    }
    return "";
  });

  const body = parts.join("");
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function anthropicCompletion(content: string): Response {
  return new Response(
    JSON.stringify({
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: content }],
      model: "claude-3-sonnet",
      usage: { input_tokens: 10, output_tokens: 20 },
    }),
    {
      headers: { "Content-Type": "application/json" },
    },
  );
}

// --- Tests ---

describe("ProxyHandler", () => {
  describe("non-streaming proxy", () => {
    test("returns OpenAI-format completion for OpenAI provider", async () => {
      const fetchFn = createMockFetch([
        openAICompletion("Hello world"),
      ]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe(200);

      const body = JSON.parse(result.body as string);
      expect(body.object).toBe("chat.completion");
      expect(body.choices[0].message.content).toBe("Hello world");
      expect(body.usage.prompt_tokens).toBe(10);
      expect(body.usage.completion_tokens).toBe(20);
    });

    test("returns OpenAI-format completion for Anthropic provider", async () => {
      const fetchFn = (() => {
        return Promise.resolve(anthropicCompletion("Bonjour le monde"));
      }) as unknown as typeof fetch;

      const handler = buildHandler([realModelAnthropic], [providerAnthropic], fetchFn);

      const result = await handler.handle({
        model: "claude-3",
        messages: [{ role: "user", content: "Salut" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const body = JSON.parse(result.body as string);
      expect(body.object).toBe("chat.completion");
      expect(body.choices[0].message.content).toBe("Bonjour le monde");
      expect(body.usage.prompt_tokens).toBe(10);
      expect(body.usage.completion_tokens).toBe(20);
    });

    test("text/plain content-type is parsed as JSON, NOT as SSE", async () => {
      // Provider returns text/plain with valid JSON body — should be parsed as JSON, not SSE
      const textPlainResponse = new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "plain text response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
        }),
        {
          headers: { "Content-Type": "text/plain" },
        },
      );
      const fetchFn = createMockFetch([textPlainResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe(200);

      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("plain text response");
      expect(body.usage.prompt_tokens).toBe(5);
      expect(body.usage.completion_tokens).toBe(10);
    });

    test("text/html content-type is parsed as JSON, NOT as SSE", async () => {
      const textHtmlResponse = new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "html response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 3, completion_tokens: 7, total_tokens: 10 },
        }),
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        },
      );
      const fetchFn = createMockFetch([textHtmlResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("html response");
    });

    test("text/event-stream content-type triggers SSE parsing", async () => {
      // Provider returns SSE despite non-stream request
      const sseResponse = openAIStreamChunks([
        { content: "Hello" },
        { content: " from SSE" },
        { done: true },
      ]);
      const fetchFn = createMockFetch([sseResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe(200);

      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("Hello from SSE");
    });

    test("application/xhtml+xml content-type is parsed as JSON, NOT as SSE", async () => {
      const xhtmlResponse = new Response(
        JSON.stringify({
          id: "chatcmpl-test",
          object: "chat.completion",
          choices: [{ index: 0, message: { role: "assistant", content: "xhtml response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: 2, completion_tokens: 4, total_tokens: 6 },
        }),
        {
          headers: { "Content-Type": "application/xhtml+xml" },
        },
      );
      const fetchFn = createMockFetch([xhtmlResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("xhtml response");
    });
  });

  describe("streaming proxy", () => {
    test("returns ReadableStream of OpenAI-format SSE events", async () => {
      const fetchFn = createMockFetch([
        openAIStreamChunks([
          { content: "Hello" },
          { content: " world" },
          { done: true },
        ]),
      ]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe(200);
      expect(result.body).toBeInstanceOf(ReadableStream);

      const chunks = await collectStreamChunks(result.body as ReadableStream<Uint8Array>);
      const text = chunks.join("");

      // Should contain content chunks
      expect(text).toContain("chat.completion.chunk");
      expect(text).toContain("Hello");
      expect(text).toContain("world");
      // Should end with [DONE]
      expect(text).toContain("[DONE]");
    });

    test("converts Anthropic SSE stream to OpenAI format", async () => {
      const fetchFn = createMockFetch([
        anthropicStreamChunks([
          { type: "message_start" },
          { type: "content_block_delta", text: "Bonjour" },
          { type: "content_block_delta", text: " le monde" },
          { type: "message_delta" },
          { type: "message_stop" },
        ]),
      ]);
      const handler = buildHandler([realModelAnthropic], [providerAnthropic], fetchFn);

      const result = await handler.handle({
        model: "claude-3",
        messages: [{ role: "user", content: "Salut" }],
        stream: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const chunks = await collectStreamChunks(result.body as ReadableStream<Uint8Array>);
      const text = chunks.join("");

      // Output must be OpenAI format
      expect(text).toContain("chat.completion.chunk");
      expect(text).toContain("Bonjour");
      expect(text).toContain("le monde");
      expect(text).toContain("[DONE]");

      // Should NOT contain Anthropic-specific event types
      expect(text).not.toContain("content_block_delta");
      expect(text).not.toContain("message_start");
    });
  });

  describe("error handling", () => {
    test("model not found → 404", async () => {
      const handler = buildHandler([], []);

      const result = await handler.handle({
        model: "nonexistent",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(404);
      expect(result.error.code).toBe("model_not_found");
    });

    test("all providers failed → 503", async () => {
      const handler = buildHandler([fallbackModel], [providerOpenAI, providerAnthropic]);
      // Mark both providers unhealthy
      const resolver = buildResolver([fallbackModel], [providerOpenAI, providerAnthropic]);
      resolver.markUnhealthy("p-openai");
      resolver.markUnhealthy("p-anthropic");

      const registry = new AdapterRegistry();
      registry.register(createOpenAIMockAdapter());
      registry.register(new AnthropicAdapter());

      const handlerWithUnhealthy = new ProxyHandler({
        resolver,
        registry,
        fetchFn: (() => Promise.resolve(new Response())) as unknown as typeof fetch,
      });

      const result = await handlerWithUnhealthy.handle({
        model: "fallback-model",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(503);
      expect(result.error.code).toBe("all_providers_failed");
    });

    test("provider rate limit → marks unhealthy and falls back to next provider", async () => {
      const rateLimitResponse = new Response(
        JSON.stringify({
          error: { message: "Rate limited", type: "rate_limit_error", code: "rate_limit_exceeded" },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );

      // First call returns 429, second call succeeds with Anthropic
      const fetchFn = createMockFetch([rateLimitResponse, anthropicCompletion("Fallback response")]);

      const logs: unknown[] = [];
      const handler = buildHandler(
        [fallbackModel, realModelOpenAI, realModelAnthropic],
        [providerOpenAI, providerAnthropic],
        fetchFn,
        (l) => logs.push(l),
      );

      const result = await handler.handle({
        model: "fallback-model",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      // Should succeed with fallback provider
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.status).toBe(200);

      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("Fallback response");

      // Should have logged the success (not the 429 error)
      expect(logs.length).toBe(1);
      const log = logs[0] as Record<string, unknown>;
      expect(log.status).toBe(200);
      expect(log.providerId).toBe("p-anthropic");
    });

    test("network error → 502", async () => {
      const fetchFn = (() => {
        throw new TypeError("fetch failed");
      }) as unknown as typeof fetch;

      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(502);
      expect(result.error.code).toBe("network_error");
    });

    test("timeout → 504", async () => {
      // Simulate a fetch that rejects with AbortError when signal fires
      const fetchFn = ((url: string | URL | Request, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          if (signal) {
            signal.addEventListener("abort", () => {
              const err = new DOMException("The operation was aborted.", "AbortError");
              reject(err);
            });
          }
          // Never resolves on its own — waits for abort
        });
      }) as unknown as typeof fetch;

      const handler = buildHandler(
        [realModelOpenAI],
        [providerOpenAI],
        fetchFn,
        undefined,
        50, // 50ms timeout
      );

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.status).toBe(504);
      expect(result.error.code).toBe("timeout");
    });
  });

  describe("request logging", () => {
    test("emits log on successful non-streaming request", async () => {
      const fetchFn = createMockFetch([openAICompletion("Hi")]);
      const logs: unknown[] = [];
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn, (l) => logs.push(l));

      await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(logs.length).toBe(1);
      const log = logs[0] as Record<string, unknown>;
      expect(log.model).toBe("gpt-4");
      expect(log.providerId).toBe("p-openai");
      expect(log.status).toBe(200);
      expect(log.stream).toBe(false);
      expect(typeof log.durationMs).toBe("number");
    });

    test("emits log on error", async () => {
      const fetchFn = createMockFetch([rateLimitResponse()]);
      const logs: unknown[] = [];
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn, (l) => logs.push(l));

      await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(logs.length).toBe(1);
      const log = logs[0] as Record<string, unknown>;
      expect(log.error).toBeDefined();
    });
  });

  describe("error masking", () => {
    test("provider error with sensitive info is masked from client response", async () => {
      const sensitiveResponse = new Response(
        JSON.stringify({
          error: {
            message: "Invalid API key sk-proj-abc123DEF456 provided at https://internal-api.corp.example.com/v2/models",
            type: "authentication_error",
            code: "invalid_api_key",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );

      const fetchFn = createMockFetch([sensitiveResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).not.toContain("sk-proj-abc123DEF456");
      expect(result.error.message).not.toContain("internal-api.corp.example.com");
      expect(result.error.message).not.toContain("Invalid API key");
      expect(result.error.correlationId).toBeDefined();
      expect(result.error.correlationId!.length).toBeGreaterThan(0);
    });

    test("provider error with sensitive info is logged server-side with full details", async () => {
      const sensitiveMessage = "Authentication failed: key sk-live-DEADBEEF for https://api.openai.internal/v1";
      const sensitiveResponse = new Response(
        JSON.stringify({
          error: {
            message: sensitiveMessage,
            type: "authentication_error",
            code: "invalid_api_key",
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );

      const logs: unknown[] = [];
      const fetchFn = createMockFetch([sensitiveResponse]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn, (l) => logs.push(l));

      await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(logs.length).toBe(1);
      const log = logs[0] as Record<string, unknown>;
      expect(log.error).toContain("sk-live-DEADBEEF");
      expect(log.error).toContain("api.openai.internal");
      expect(log.correlationId).toBeDefined();
      expect(log.providerErrorCode).toBe("invalid_api_key");
    });

    test("network error message is masked from client but logged server-side", async () => {
      const fetchFn = (() => {
        throw new TypeError("Connection refused to https://db-internal.corp.local:5432");
      }) as unknown as typeof fetch;

      const logs: unknown[] = [];
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn, (l) => logs.push(l));

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;

      expect(result.error.message).not.toContain("db-internal.corp.local");
      expect(result.error.message).not.toContain("5432");
      expect(result.error.correlationId).toBeDefined();

      const log = logs[0] as Record<string, unknown>;
      expect(log.error).toContain("db-internal.corp.local");
      expect(log.error).toContain("5432");
    });

    test("all client-facing errors contain correlation ID", async () => {
      const fetchFn = createMockFetch([rateLimitResponse()]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.correlationId).toBeDefined();
      expect(result.error.correlationId!.length).toBeGreaterThan(0);
    });
  });

  describe("SSE output format validation", () => {
    test("stream output is valid OpenAI SSE format", async () => {
      const fetchFn = createMockFetch([
        openAIStreamChunks([
          { content: "Test" },
          { done: true },
        ]),
      ]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const chunks = await collectStreamChunks(result.body as ReadableStream<Uint8Array>);
      const text = chunks.join("");

      // Parse each data: line
      const lines = text.split("\n").filter((l) => l.startsWith("data: "));
      const dataLines = lines.map((l) => l.slice(6).trim());

      // Last should be [DONE]
      expect(dataLines[dataLines.length - 1]).toBe("[DONE]");

      // All others should be valid JSON with correct object type
      for (const line of dataLines) {
        if (line === "[DONE]") continue;
        const parsed = JSON.parse(line);
        expect(parsed.object).toBe("chat.completion.chunk");
        expect(parsed.id).toMatch(/^chatcmpl-/);
        expect(parsed.choices).toBeInstanceOf(Array);
        expect(parsed.choices[0].index).toBe(0);
      }
    });
  });

  describe("stream error cancels upstream reader", () => {
    test("upstream reader is cancelled when stream processing errors", async () => {
      let upstreamCancelCalled = false;
      let pullCount = 0;

      // Pull-based source: yields data on first pull, stays open after
      const upstreamBody = new ReadableStream<Uint8Array>({
        pull(controller) {
          pullCount++;
          if (pullCount === 1) {
            controller.enqueue(new TextEncoder().encode('data: {invalid json!!!\n\n'));
          }
          // Subsequent pulls: no-op, stream stays open
        },
        cancel() {
          upstreamCancelCalled = true;
        },
      });

      // Adapter that throws on parseSSEChunk for malformed data
      const throwingAdapter = createOpenAIMockAdapter();
      const originalParse = throwingAdapter.parseSSEChunk.bind(throwingAdapter);
      throwingAdapter.parseSSEChunk = (chunk: string) => {
        const result = originalParse(chunk);
        if (result) return result;
        throw new Error("Failed to parse SSE chunk");
      };

      const mockResponse = new Response(upstreamBody as unknown as ReadableStream, {
        headers: { "Content-Type": "text/event-stream" },
      });

      const fetchFn = (() => Promise.resolve(mockResponse)) as unknown as typeof fetch;

      const resolver = buildResolver([realModelOpenAI], [providerOpenAI]);
      const registry = new AdapterRegistry();
      registry.register(throwingAdapter);
      registry.register(new AnthropicAdapter());

      const handler = new ProxyHandler({
        resolver,
        registry,
        fetchFn,
        onLog: () => {},
        getProviderCredentials: (providerId: string) => {
          const provider = [providerOpenAI].find(p => p.id === providerId);
          if (!provider) return Promise.resolve(null);
          return Promise.resolve({ baseUrl: provider.baseUrl, apiKey: provider.apiKey });
        },
      });

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      const stream = result.body as ReadableStream<Uint8Array>;
      const reader = stream.getReader();

      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch {
        // Expected — stream errors propagate
      }

      await new Promise((r) => setTimeout(r, 20));

      expect(upstreamCancelCalled).toBe(true);
    });
  });

  describe("client disconnect aborts upstream request", () => {
    test("aborting signal before fetch completes propagates to fetch signal", async () => {
      const clientAbort = new AbortController();
      let fetchSignal: AbortSignal | undefined;

      const fetchFn = (async (_url: string, init: RequestInit) => {
        fetchSignal = init.signal;
        return openAICompletion("Aborted");
      }) as unknown as typeof fetch;

      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      clientAbort.abort();

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
        signal: clientAbort.signal,
      });

      expect(fetchSignal).toBeDefined();
      expect(fetchSignal!.aborted).toBe(true);
    });

    test("aborting signal during streaming propagates to fetch signal via cancel", async () => {
      const clientAbort = new AbortController();
      let fetchSignal: AbortSignal | undefined;

      const fetchFn = (async (_url: string, init: RequestInit) => {
        fetchSignal = init.signal;
        return openAIStreamChunks([{ content: "Hello" }, { done: true }]);
      }) as unknown as typeof fetch;

      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
        signal: clientAbort.signal,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;

      expect(fetchSignal).toBeDefined();
      expect(fetchSignal!.aborted).toBe(false);

      const stream = result.body as ReadableStream<Uint8Array>;
      stream.cancel();

      await new Promise((r) => setTimeout(r, 20));

      expect(fetchSignal!.aborted).toBe(true);
    });

    test("request without signal completes normally", async () => {
      const fetchFn = createMockFetch([openAICompletion("No signal")]);
      const handler = buildHandler([realModelOpenAI], [providerOpenAI], fetchFn);

      const result = await handler.handle({
        model: "gpt-4",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      });

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const body = JSON.parse(result.body as string);
      expect(body.choices[0].message.content).toBe("No signal");
    });
  });
});

// --- Helpers ---

async function collectStreamChunks(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(decoder.decode(value, { stream: true }));
  }

  return chunks;
}

function rateLimitResponse(): Response {
  return new Response(
    JSON.stringify({
      error: { message: "Rate limited", type: "rate_limit_error", code: "rate_limit_exceeded" },
    }),
    { status: 429, headers: { "Content-Type": "application/json" } },
  );
}
