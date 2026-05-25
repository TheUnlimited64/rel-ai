import { describe, expect, test } from "bun:test";
import { AnthropicAdapter } from "../../../src/adapters/anthropic/adapter.js";

const adapter = new AnthropicAdapter();

describe("AnthropicAdapter", () => {
  describe("type", () => {
    test("type is anthropic", () => {
      expect(adapter.type).toBe("anthropic");
    });
  });

  describe("createRequest", () => {
    test("converts system message to system field", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [
          { role: "system", content: "You are helpful." },
          { role: "user", content: "Hello" },
        ],
        stream: true,
        overrides: { apiKey: "sk-test" },
      });

      const body = result.body as { system?: string; messages: Array<{ role: string; content: string }> };
      expect(body.system).toBe("You are helpful.");
      expect(body.messages).toEqual([{ role: "user", content: "Hello" }]);
    });

    test("includes anthropic-version header", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-test" },
      });

      expect(result.headers["anthropic-version"]).toBe("2023-06-01");
    });

    test("defaults max_tokens to 4096", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-test" },
      });

      const body = result.body as { max_tokens: number };
      expect(body.max_tokens).toBe(4096);
    });

    test("uses custom max_tokens from overrides", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-test", max_tokens: 8192 },
      });

      const body = result.body as { max_tokens: number };
      expect(body.max_tokens).toBe(8192);
    });

    test("url uses baseUrl from overrides", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-test", baseUrl: "https://proxy.example.com" },
      });

      expect(result.url).toBe("https://proxy.example.com/v1/messages");
    });

    test("omits system field when no system messages", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-test" },
      });

      const body = result.body as Record<string, unknown>;
      expect(body.system).toBeUndefined();
    });

    test("throws descriptive error when apiKey is missing", () => {
      expect(() =>
        adapter.createRequest({
          model: "claude-3-sonnet",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
        })
      ).toThrow("Anthropic API key is required");
    });

    test("throws descriptive error when apiKey is undefined", () => {
      expect(() =>
        adapter.createRequest({
          model: "claude-3-sonnet",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
          overrides: { apiKey: undefined },
        })
      ).toThrow("Anthropic API key is required");
    });

    test("throws descriptive error when apiKey is empty string", () => {
      expect(() =>
        adapter.createRequest({
          model: "claude-3-sonnet",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
          overrides: { apiKey: "  " },
        })
      ).toThrow("Anthropic API key is required");
    });

    test("throws descriptive error when apiKey is non-string type", () => {
      expect(() =>
        adapter.createRequest({
          model: "claude-3-sonnet",
          messages: [{ role: "user", content: "Hello" }],
          stream: true,
          overrides: { apiKey: 12345 },
        })
      ).toThrow("Anthropic API key is required");
    });

    test("sets x-api-key header when apiKey is valid", () => {
      const result = adapter.createRequest({
        model: "claude-3-sonnet",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "sk-valid-key" },
      });

      expect(result.headers["x-api-key"]).toBe("sk-valid-key");
    });
  });

  describe("parseSSEChunk", () => {
    test("parses text_delta content", () => {
      const chunk = `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello world"}}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ content: "Hello world", done: false });
    });

    test("parses thinking_delta", () => {
      const chunk = `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Let me think..."}}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ thinking: "Let me think...", done: false });
    });

    test("parses message_start with usage", () => {
      const chunk = `event: message_start\ndata: {"type":"message_start","message":{"id":"msg_xxx","type":"message","role":"assistant","usage":{"input_tokens":10,"output_tokens":0}}}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({
        done: false,
        usage: { promptTokens: 10, completionTokens: 0 },
      });
    });

    test("parses message_stop returns done true", () => {
      const chunk = `event: message_stop\ndata: {"type":"message_stop"}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ done: true });
    });

    test("returns null for unknown event types", () => {
      const chunk = `event: ping\ndata: {"type":"ping"}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toBeNull();
    });

    test("parses message_delta with usage", () => {
      const chunk = `event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":42}}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({
        done: false,
        usage: { promptTokens: 0, completionTokens: 42 },
      });
    });

    test("handles multiple SSE events in one chunk", () => {
      const chunk = `event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hi"}}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n`;

      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ content: "Hi", done: true });
    });
  });

  describe("parseError", () => {
    test("extracts error correctly", async () => {
      const response = new Response(
        JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: "Bad request" } }),
        { status: 400 }
      );

      const result = await adapter.parseError(response);
      expect(result).toEqual({
        code: "invalid_request_error",
        message: "Bad request",
        status: 400,
        retryable: false,
      });
    });

    test("marks 429 as retryable", async () => {
      const response = new Response(
        JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "Slow down" } }),
        { status: 429 }
      );

      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(true);
    });

    test("marks 500 as retryable", async () => {
      const response = new Response(
        JSON.stringify({ type: "error", error: { type: "api_error", message: "Internal error" } }),
        { status: 500 }
      );

      const result = await adapter.parseError(response);
      expect(result.retryable).toBe(true);
    });

    test("handles malformed response body", async () => {
      const response = new Response("not json", { status: 502 });

      const result = await adapter.parseError(response);
      expect(result.status).toBe(502);
      expect(result.retryable).toBe(true);
    });
  });

  describe("isRateLimitError", () => {
    test("returns true for 429 status", () => {
      expect(adapter.isRateLimitError({ code: "unknown", message: "rate limited", status: 429, retryable: true })).toBe(true);
    });

    test("returns true for rate_limit_error code", () => {
      expect(adapter.isRateLimitError({ code: "rate_limit_error", message: "slow down", status: 400, retryable: false })).toBe(true);
    });

    test("returns false for non-rate-limit errors", () => {
      expect(adapter.isRateLimitError({ code: "invalid_request_error", message: "bad", status: 400, retryable: false })).toBe(false);
    });
  });
});
