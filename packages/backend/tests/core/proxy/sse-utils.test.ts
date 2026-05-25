import { describe, expect, test } from "bun:test";
import { parseOpenAISSE, parseOpenAIError, isOpenAIRateLimitError } from "../../../src/core/proxy/sse-utils.js";
import type { ProviderError } from "../../../src/core/provider/types.js";

describe("parseOpenAISSE", () => {
  test("parses standard SSE line with content", () => {
    const line = `data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}`;
    const result = parseOpenAISSE(line);
    expect(result).not.toBeNull();
    expect(result!.content).toBe("Hello");
    expect(result!.done).toBe(false);
  });

  test("parses data: [DONE] as done signal", () => {
    const chunk = "data: [DONE]\n\n";
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.done).toBe(true);
  });

  test("preserves tool_calls in delta", () => {
    const chunk = `data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"tool_calls":[{"index":0,"id":"call_abc","type":"function","function":{"name":"get_weather","arguments":""}}]},"finish_reason":null}]}`;
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.tool_calls).toBeDefined();
    expect(result!.tool_calls!.length).toBe(1);
    expect(result!.tool_calls![0]!.id).toBe("call_abc");
    expect(result!.tool_calls![0]!.function?.name).toBe("get_weather");
  });

  test("preserves reasoning_content (thinking)", () => {
    const chunk = `data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{"reasoning_content":"Let me think"},"finish_reason":null}]}`;
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.thinking).toBe("Let me think");
  });

  test("preserves usage field", () => {
    const chunk = `data: {"id":"chatcmpl-123","choices":[{"index":0,"delta":{},"finish_reason":null}],"usage":{"prompt_tokens":10,"completion_tokens":5}}`;
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.usage).toBeDefined();
    expect(result!.usage!.promptTokens).toBe(10);
    expect(result!.usage!.completionTokens).toBe(5);
  });

  test("returns null for empty line", () => {
    const result = parseOpenAISSE("");
    expect(result).toBeNull();
  });

  test("returns null for line without data: prefix", () => {
    const result = parseOpenAISSE('{"id":"chatcmpl-123"}');
    expect(result).toBeNull();
  });

  test("skips line with invalid JSON after data: prefix", () => {
    const result = parseOpenAISSE("data: not-json-at-all");
    expect(result).toBeNull();
  });

  test("returns null for data: with empty payload", () => {
    const result = parseOpenAISSE("data: ");
    expect(result).toBeNull();
  });

  test("accumulates content across multiple lines", () => {
    const chunk = `data: {"choices":[{"delta":{"content":"Hel"},"finish_reason":null}]}\ndata: {"choices":[{"delta":{"content":"lo"},"finish_reason":"stop"}]}`;
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.content).toBe("Hello");
    expect(result!.finish_reason).toBe("stop");
  });

  test("preserves finish_reason when not null-like string", () => {
    const chunk = `data: {"choices":[{"delta":{},"finish_reason":"stop"}]}`;
    const result = parseOpenAISSE(chunk);
    expect(result).not.toBeNull();
    expect(result!.finish_reason).toBe("stop");
  });

  test("ignores finish_reason when it is the string 'null'", () => {
    const chunk = `data: {"choices":[{"delta":{},"finish_reason":"null"}]}`;
    const result = parseOpenAISSE(chunk);
    // "null" as string should be ignored per the source check finish_reason !== "null"
    expect(result).toBeNull();
  });
});

describe("parseOpenAIError", () => {
  test("parses OpenAI error format", async () => {
    const response = new Response(
      JSON.stringify({
        error: { message: "Rate limit exceeded", type: "rate_limit_error", code: "rate_limit_exceeded" },
      }),
      { status: 429 },
    );
    const result = await parseOpenAIError(response);
    expect(result.code).toBe("rate_limit_exceeded");
    expect(result.message).toBe("Rate limit exceeded");
    expect(result.status).toBe(429);
    expect(result.retryable).toBe(false);
  });

  test("marks 5xx as retryable", async () => {
    const response = new Response(
      JSON.stringify({ error: { message: "Internal error", code: "server_error" } }),
      { status: 500 },
    );
    const result = await parseOpenAIError(response);
    expect(result.retryable).toBe(true);
    expect(result.status).toBe(500);
  });

  test("handles missing error object with defaults", async () => {
    const response = new Response(JSON.stringify({}), { status: 400 });
    const result = await parseOpenAIError(response);
    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("Unknown error");
    expect(result.status).toBe(400);
  });

  test("handles non-JSON response body", async () => {
    const response = new Response("not json", { status: 502 });
    const result = await parseOpenAIError(response);
    expect(result.code).toBe("UNKNOWN");
    expect(result.message).toBe("Unknown error");
    expect(result.status).toBe(502);
    expect(result.retryable).toBe(true);
  });

  test("handles authentication error (401)", async () => {
    const response = new Response(
      JSON.stringify({ error: { message: "Invalid API key", code: "invalid_api_key" } }),
      { status: 401 },
    );
    const result = await parseOpenAIError(response);
    expect(result.code).toBe("invalid_api_key");
    expect(result.status).toBe(401);
    expect(result.retryable).toBe(false);
  });
});

describe("isOpenAIRateLimitError", () => {
  test("returns true for status 429", () => {
    const error: ProviderError = { code: "some_error", message: "err", status: 429, retryable: false };
    expect(isOpenAIRateLimitError(error)).toBe(true);
  });

  test("returns true for code containing 'rate'", () => {
    const error: ProviderError = { code: "rate_limit_exceeded", message: "err", status: 400, retryable: false };
    expect(isOpenAIRateLimitError(error)).toBe(true);
  });

  test("returns true for code containing 'Rate' (case insensitive)", () => {
    const error: ProviderError = { code: "Rate_Limit", message: "err", status: 400, retryable: false };
    expect(isOpenAIRateLimitError(error)).toBe(true);
  });

  test("returns false for non-rate-limit error", () => {
    const error: ProviderError = { code: "invalid_api_key", message: "err", status: 401, retryable: false };
    expect(isOpenAIRateLimitError(error)).toBe(false);
  });
});
