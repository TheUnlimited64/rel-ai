import { describe, expect, test } from "bun:test";
import { CommandCodeAdapter } from "../../../src/adapters/commandcode/adapter.js";

const adapter = new CommandCodeAdapter();

describe("CommandCodeAdapter", () => {
  describe("type", () => {
    test("type is commandcode", () => {
      expect(adapter.type).toBe("commandcode");
    });
  });

  describe("createRequest", () => {
    test("builds correct URL with default baseUrl", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      expect(result.url).toBe("https://api.commandcode.ai/alpha/generate");
    });

    test("uses custom baseUrl from overrides", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key", baseUrl: "https://proxy.example.com" },
      });

      expect(result.url).toBe("https://proxy.example.com/alpha/generate");
    });

    test("sets Authorization header with Bearer token", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      expect(result.headers["Authorization"]).toBe("Bearer cc-test-key");
    });

    test("sets required custom headers", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      expect(result.headers["Content-Type"]).toBe("application/json");
      expect(result.headers["x-command-code-version"]).toBe("0.24.1");
      expect(result.headers["x-cli-environment"]).toBe("production");
    });

    test("wraps messages in params object with config metadata", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      expect(body.config).toBeDefined();
      expect(body.memory).toBe("");
      expect(body.taste).toBe("");
      expect(body.skills).toBeNull();
      expect(body.permissionMode).toBe("standard");

      const params = body.params as Record<string, unknown>;
      expect(params.model).toBe("deepseek/deepseek-v4-flash");
      expect(params.stream).toBe(true);
      expect(params.tools).toEqual([]);
    });

    test("extracts system messages into params.system", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hello" },
        ],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.system).toBe("You are helpful.");
      expect(params.messages).toEqual([{ role: "user", content: "Hello" }]);
    });

    test("joins multiple system messages", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "system", content: "Rule one." },
          { role: "system", content: "Rule two." },
          { role: "user", content: "Hello" },
        ],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.system).toBe("Rule one.\nRule two.");
    });

    test("defaults max_tokens to 4096", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.max_tokens).toBe(4096);
    });

    test("uses custom max_tokens from overrides", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key", max_tokens: 8192 },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.max_tokens).toBe(8192);
    });

    test("always forces stream:true regardless of input", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: false,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.stream).toBe(true);
    });

    test("strips internal keys from overrides in params", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key", baseUrl: "https://custom.com", max_tokens: 2048, temperature: 0.7 },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.temperature).toBe(0.7);
      expect((params as Record<string, unknown>).apiKey).toBeUndefined();
      expect((params as Record<string, unknown>).baseUrl).toBeUndefined();
    });

    test("throws when apiKey is missing", () => {
      expect(() =>
        adapter.createRequest({
          model: "deepseek/deepseek-v4-flash",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        })
      ).toThrow("Command Code API key is required");
    });

    test("throws when apiKey is empty string", () => {
      expect(() =>
        adapter.createRequest({
          model: "deepseek/deepseek-v4-flash",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
          overrides: { apiKey: "  " },
        })
      ).toThrow("Command Code API key is required");
    });
  });

  describe("parseSSEChunk", () => {
    test("parses text-delta event", () => {
      const chunk = JSON.stringify({ type: "text-delta", text: "Hello" }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ content: "Hello", done: false });
    });

    test("parses reasoning-delta event as thinking", () => {
      const chunk = JSON.stringify({ type: "reasoning-delta", text: "thinking..." }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ thinking: "thinking...", done: false });
    });

    test("parses finish event with usage", () => {
      const chunk = JSON.stringify({
        type: "finish",
        finishReason: "stop",
        totalUsage: { inputTokens: 100, outputTokens: 50 },
      }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({
        done: true,
        usage: { promptTokens: 100, completionTokens: 50 },
      });
    });

    test("parses finish event without usage", () => {
      const chunk = JSON.stringify({ type: "finish", finishReason: "stop" }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ done: true });
    });

    test("throws on error event", () => {
      const chunk = JSON.stringify({
        type: "error",
        error: { message: "Rate limit exceeded", code: "RATE_LIMIT" },
      }) + "\n";
      expect(() => adapter.parseSSEChunk(chunk)).toThrow("Rate limit exceeded");
    });

    test("throws on error event with string error", () => {
      const chunk = JSON.stringify({
        type: "error",
        error: "Something went wrong",
      }) + "\n";
      expect(() => adapter.parseSSEChunk(chunk)).toThrow("Something went wrong");
    });

    test("returns null for start event", () => {
      const chunk = JSON.stringify({ type: "start" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for start-step event", () => {
      const chunk = JSON.stringify({ type: "start-step", request: {} }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for reasoning-start event", () => {
      const chunk = JSON.stringify({ type: "reasoning-start", id: "r1" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for reasoning-end event", () => {
      const chunk = JSON.stringify({ type: "reasoning-end", id: "r1" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for text-start event", () => {
      const chunk = JSON.stringify({ type: "text-start", id: "t1" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for text-end event", () => {
      const chunk = JSON.stringify({ type: "text-end", id: "t1" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for finish-step event", () => {
      const chunk = JSON.stringify({ type: "finish-step", finishReason: "stop" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for provider-metadata event", () => {
      const chunk = JSON.stringify({ type: "provider-metadata" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for tool-call event", () => {
      const chunk = JSON.stringify({ type: "tool-call", toolCallId: "tc1" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("returns null for empty lines", () => {
      expect(adapter.parseSSEChunk("\n\n")).toBeNull();
    });

    test("returns null for unparseable lines", () => {
      expect(adapter.parseSSEChunk("not json\n")).toBeNull();
    });

    test("handles data:-prefixed lines as fallback", () => {
      const chunk = "data: " + JSON.stringify({ type: "text-delta", text: "Hello" }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ content: "Hello", done: false });
    });

    test("accumulates multiple text-delta events in single chunk", () => {
      const line1 = JSON.stringify({ type: "text-delta", text: "Hello" });
      const line2 = JSON.stringify({ type: "text-delta", text: " world" });
      const chunk = line1 + "\n" + line2 + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ content: "Hello world", done: false });
    });

    test("merges content and thinking in single chunk", () => {
      const line1 = JSON.stringify({ type: "reasoning-delta", text: "hmm" });
      const line2 = JSON.stringify({ type: "text-delta", text: "answer" });
      const chunk = line1 + "\n" + line2 + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ thinking: "hmm", content: "answer", done: false });
    });
  });

  describe("parseError", () => {
    test("extracts error from response body", async () => {
      const response = new Response(
        JSON.stringify({ error: { code: "BAD_REQUEST", message: "Invalid request" } }),
        { status: 400 }
      );
      const result = await adapter.parseError(response);
      expect(result.code).toBe("BAD_REQUEST");
      expect(result.message).toBe("Invalid request");
      expect(result.status).toBe(400);
      expect(result.retryable).toBe(false);
    });

    test("marks 429 as retryable", async () => {
      const response = new Response(
        JSON.stringify({ error: { code: "RATE_LIMIT", message: "Too many requests" } }),
        { status: 429 }
      );
      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(true);
    });

    test("marks 5xx as retryable", async () => {
      const response = new Response("Internal Server Error", { status: 500 });
      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(true);
    });

    test("marks 4xx (not 429) as non-retryable", async () => {
      const response = new Response(
        JSON.stringify({ error: { code: "UNAUTHORIZED", message: "Invalid API key" } }),
        { status: 401 }
      );
      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(false);
    });
  });

  describe("isRateLimitError", () => {
    test("returns true for 429", () => {
      expect(adapter.isRateLimitError({ code: "rate_limit", message: "Too many", status: 429, retryable: true })).toBe(true);
    });

    test("returns false for non-429", () => {
      expect(adapter.isRateLimitError({ code: "unknown", message: "Error", status: 500, retryable: true })).toBe(false);
    });
  });

  describe("default baseUrl", () => {
    test("defaults to https://api.commandcode.ai", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });
      expect(result.url).toBe("https://api.commandcode.ai/alpha/generate");
    });

    test("uses constructor defaultBaseUrl", () => {
      const customAdapter = new CommandCodeAdapter(undefined, "https://custom-proxy.com");
      const result = customAdapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });
      expect(result.url).toBe("https://custom-proxy.com/alpha/generate");
    });
  });
});
