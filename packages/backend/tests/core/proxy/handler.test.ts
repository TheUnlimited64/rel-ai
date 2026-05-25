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
