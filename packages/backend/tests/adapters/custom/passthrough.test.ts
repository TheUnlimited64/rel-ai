import { describe, expect, test } from "bun:test";
import { PassthroughAdapter } from "../../../src/adapters/custom/passthrough.js";

const adapter = new PassthroughAdapter();

describe("PassthroughAdapter", () => {
  describe("type", () => {
    test("type is 'custom'", () => {
      expect(adapter.type).toBe("custom");
    });
  });

  describe("createRequest", () => {
    test("forwards messages as-is to baseUrl/chat/completions", () => {
      const result = adapter.createRequest({
        model: "my-model-v2",
        messages: [
          { role: "system", content: "You are helpful" },
          { role: "user", content: "Hello" },
        ],
        stream: true,
        overrides: { apiKey: "sk-test", baseUrl: "https://custom.api.example.com" },
      });

      expect(result.url).toBe("https://custom.api.example.com/chat/completions");
      expect(result.headers).toEqual({
        Authorization: "Bearer sk-test",
        "Content-Type": "application/json",
      });

      const body = result.body as { model: string; messages: unknown[]; stream: boolean };
      expect(body.model).toBe("my-model-v2");
      expect(body.messages).toEqual([
        { role: "system", content: "You are helpful" },
        { role: "user", content: "Hello" },
      ]);
      expect(body.stream).toBe(true);
    });

    test("strips internal keys from overrides before forwarding", () => {
      const result = adapter.createRequest({
        model: "test",
        messages: [{ role: "user", content: "hi" }],
        stream: false,
        overrides: { apiKey: "sk-x", baseUrl: "https://host", temperature: 0.5 },
      });

      const body = result.body as Record<string, unknown>;
      expect(body.temperature).toBe(0.5);
      expect(body.apiKey).toBeUndefined();
      expect(body.baseUrl).toBeUndefined();
    });

    test("throws when baseUrl is not provided in overrides", () => {
      expect(() =>
        adapter.createRequest({
          model: "test",
          messages: [{ role: "user", content: "hi" }],
          stream: false,
          overrides: { apiKey: "sk-x" },
        }),
      ).toThrow("baseUrl is required");
    });
  });

  describe("parseSSEChunk", () => {
    test("parses OpenAI-style content delta", () => {
      const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({ content: "Hello", done: false });
    });

    test("parses reasoning_content as thinking", () => {
      const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"Let me think..."}}]}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({ thinking: "Let me think...", done: false });
    });

    test("returns done=true for data: [DONE]", () => {
      const chunk = "data: [DONE]";
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({ done: true });
    });

    test("extracts usage from chunk", () => {
      const chunk = 'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":20}}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({ done: false, usage: { promptTokens: 10, completionTokens: 20 } });
    });

    test("returns null for empty/keepalive chunks", () => {
      expect(adapter.parseSSEChunk("")).toBeNull();
      expect(adapter.parseSSEChunk("data: ")).toBeNull();
    });
  });

  describe("parseError", () => {
    test("extracts error from response body", async () => {
      const response = new Response(
        JSON.stringify({ error: { message: "Bad key", code: "auth_error" } }),
        { status: 401 },
      );

      const result = await adapter.parseError(response);

      expect(result).toEqual({
        code: "auth_error",
        message: "Bad key",
        status: 401,
        retryable: false,
      });
    });

    test("marks 5xx as retryable", async () => {
      const response = new Response("internal error", { status: 503 });
      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(true);
    });

    test("handles malformed body", async () => {
      const response = new Response("not json", { status: 502 });
      const result = await adapter.parseError(response);
      expect(result.code).toBe("UNKNOWN");
      expect(result.status).toBe(502);
    });
  });

  describe("isRateLimitError", () => {
    test("returns true for 429", () => {
      expect(adapter.isRateLimitError({ code: "UNKNOWN", message: "", status: 429, retryable: false })).toBe(true);
    });

    test("returns true when code contains 'rate'", () => {
      expect(adapter.isRateLimitError({ code: "rate_limit_exceeded", message: "", status: 400, retryable: false })).toBe(true);
    });

    test("returns false for non-429 without rate in code", () => {
      expect(adapter.isRateLimitError({ code: "auth_error", message: "", status: 401, retryable: false })).toBe(false);
    });
  });
});
