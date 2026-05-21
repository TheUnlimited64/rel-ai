import { describe, expect, test } from "bun:test";
import { OpenAIAdapter } from "../../../src/adapters/openai/adapter.js";

const adapter = new OpenAIAdapter("sk-test-key", "https://api.openai.com/v1");

describe("OpenAIAdapter", () => {
  describe("createRequest", () => {
    test("creates request with basic params", () => {
      const result = adapter.createRequest({
        model: "gpt-4",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      });

      expect(result.url).toBe("https://api.openai.com/v1/chat/completions");
      expect(result.headers).toEqual({
        Authorization: "Bearer sk-test-key",
        "Content-Type": "application/json",
      });
      expect(result.body).toEqual({
        model: "gpt-4",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
      });
    });

    test("merges overrides into body", () => {
      const result = adapter.createRequest({
        model: "gpt-4",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
        overrides: { temperature: 0.7, max_tokens: 100 },
      });

      expect(result.body).toEqual({
        model: "gpt-4",
        messages: [{ role: "user", content: "hello" }],
        stream: true,
        temperature: 0.7,
        max_tokens: 100,
      });
    });
  });

  describe("parseSSEChunk", () => {
    test("parses content delta", () => {
      const chunk = 'data: {"choices":[{"delta":{"content":"Hello"}}]}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({
        content: "Hello",
        done: false,
      });
    });

    test("parses DeepSeek reasoning_content as thinking", () => {
      const chunk = 'data: {"choices":[{"delta":{"reasoning_content":"Let me think..."}}]}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({
        thinking: "Let me think...",
        done: false,
      });
    });

    test("returns done=true for data: [DONE]", () => {
      const chunk = "data: [DONE]";
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({ done: true });
    });

    test("handles multi-line SSE chunks", () => {
      const chunk = [
        'data: {"choices":[{"delta":{"content":"Hel"}}]}',
        'data: {"choices":[{"delta":{"content":"lo"}}]}',
        "data: [DONE]",
      ].join("\n");

      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({
        content: "Hello",
        done: true,
      });
    });

    test("returns null for empty/keepalive chunks", () => {
      expect(adapter.parseSSEChunk("")).toBeNull();
      expect(adapter.parseSSEChunk("data: ")).toBeNull();
      expect(adapter.parseSSEChunk(": keepalive")).toBeNull();
    });

    test("extracts usage from final chunks", () => {
      const chunk = 'data: {"choices":[{"delta":{}}],"usage":{"prompt_tokens":10,"completion_tokens":20}}';
      const result = adapter.parseSSEChunk(chunk);

      expect(result).toEqual({
        done: false,
        usage: { promptTokens: 10, completionTokens: 20 },
      });
    });
  });

  describe("parseError", () => {
    test("extracts error from response body", async () => {
      const response = new Response(
        JSON.stringify({ error: { message: "Invalid API key", type: "invalid_request_error", code: "invalid_api_key" } }),
        { status: 401 },
      );

      const result = await adapter.parseError(response);

      expect(result).toEqual({
        code: "invalid_api_key",
        message: "Invalid API key",
        status: 401,
        retryable: false,
      });
    });

    test("marks 5xx errors as retryable", async () => {
      const response = new Response(
        JSON.stringify({ error: { message: "Server error", type: "server_error", code: "internal_error" } }),
        { status: 500 },
      );

      const result = await adapter.parseError(response);

      expect(result.retryable).toBe(true);
    });

    test("handles malformed response body", async () => {
      const response = new Response("not json", { status: 502 });

      const result = await adapter.parseError(response);

      expect(result).toEqual({
        code: "UNKNOWN",
        message: "Unknown error",
        status: 502,
        retryable: true,
      });
    });
  });

  describe("isRateLimitError", () => {
    test("returns true for 429 status", () => {
      const error = { code: "UNKNOWN", message: "Rate limited", status: 429, retryable: false };
      expect(adapter.isRateLimitError(error)).toBe(true);
    });

    test("returns true for error code containing 'rate'", () => {
      const error = { code: "rate_limit_exceeded", message: "Slow down", status: 400, retryable: false };
      expect(adapter.isRateLimitError(error)).toBe(true);
    });

    test("returns false for non-rate-limit errors", () => {
      const error = { code: "invalid_api_key", message: "Bad key", status: 401, retryable: false };
      expect(adapter.isRateLimitError(error)).toBe(false);
    });
  });
});
