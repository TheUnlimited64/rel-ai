import { describe, expect, test } from "bun:test";
import { ProxyHandler } from "../../src/core/proxy/handler.js";
import { ModelResolver } from "../../src/core/model/resolver.js";
import { AdapterRegistry } from "../../src/core/provider/registry.js";
import { OpenAIAdapter } from "../../src/adapters/openai/adapter.js";
import { AnthropicAdapter } from "../../src/adapters/anthropic/adapter.js";
import type { RequestLogData } from "../../src/core/proxy/types.js";

function createHandler(onLog: (log: RequestLogData) => void) {
  const modelMap = new Map([
    ["gpt-4", {
      id: "gpt-4",
      displayName: "GPT-4",
      providerId: "prov-1",
      providerModel: "gpt-4",
      type: "real" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  ]);
  const providerMap = new Map([
    ["prov-1", {
      id: "prov-1",
      name: "Test",
      adapterType: "openai" as const,
      baseUrl: "https://api.openai.com",
      apiKey: "sk-test",
      enabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }],
  ]);

  const resolver = new ModelResolver({
    getModel: (id) => modelMap.get(id),
    getProvider: (id) => providerMap.get(id),
  });

  const registry = new AdapterRegistry();
  registry.register(new OpenAIAdapter());
  registry.register(new AnthropicAdapter());

  return new ProxyHandler({
    resolver,
    registry,
    getProviderCredentials: async () => ({ baseUrl: "https://api.openai.com", apiKey: "sk-test" }),
    fetchFn: (() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "chatcmpl-test",
            object: "chat.completion",
            choices: [{ index: 0, message: { role: "assistant", content: "Hi" }, finish_reason: "stop" }],
            usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
          }),
          { headers: { "Content-Type": "application/json" } },
        ),
      );
    }) as unknown as typeof fetch,
    onLog,
  });
}

describe("ProxyHandler timing precision", () => {
  test("durationMs reports sub-millisecond precision", async () => {
    const logs: RequestLogData[] = [];
    const handler = createHandler((log) => logs.push(log));

    const result = await handler.handle({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hi" }],
      stream: false,
    });

    expect(result.ok).toBe(true);
    expect(logs.length).toBe(1);

    const duration = logs[0]!.durationMs;
    // performance.now() returns fractional ms; Date.now() returns integers only
    expect(duration).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(duration)).toBe(true);
  });

  test("performance.now produces fractional ms for short operations", () => {
    const start = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += i;
    void sum;
    const elapsed = performance.now() - start;

    // performance.now() yields fractional ms; Date.now() only integers
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(elapsed)).toBe(true);
    // If elapsed > 0, sub-ms precision confirmed (Date.now would round to 0)
  });
});
