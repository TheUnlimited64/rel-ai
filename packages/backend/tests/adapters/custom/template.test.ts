import { describe, expect, test } from "bun:test";
import { CustomAdapterTemplate } from "../../../src/adapters/custom/template.js";

describe("CustomAdapterTemplate", () => {
  const adapter = new CustomAdapterTemplate();

  test("type is 'custom'", () => {
    expect(adapter.type).toBe("custom");
  });

  test("createRequest returns well-formed request", () => {
    const result = adapter.createRequest({
      model: "my-model",
      messages: [{ role: "user", content: "hi" }],
      stream: true,
      overrides: { apiKey: "sk-test", baseUrl: "https://api.example.com" },
    });

    expect(result.url).toBe("https://api.example.com/chat/completions");
    expect(result.headers["Authorization"]).toBe("Bearer sk-test");
  });

  test("parseSSEChunk returns null (stub)", () => {
    expect(adapter.parseSSEChunk("data: {}")).toBeNull();
  });

  test("parseError handles malformed body", async () => {
    const response = new Response("not json", { status: 500 });
    const result = await adapter.parseError(response);
    expect(result.status).toBe(500);
    expect(result.retryable).toBe(true);
  });

  test("isRateLimitError detects 429", () => {
    expect(adapter.isRateLimitError({ code: "UNKNOWN", message: "", status: 429, retryable: false })).toBe(true);
  });

  test("isRateLimitError detects rate in code", () => {
    expect(adapter.isRateLimitError({ code: "rate_limit", message: "", status: 400, retryable: false })).toBe(true);
  });

  test("isRateLimitError returns false for non-rate errors", () => {
    expect(adapter.isRateLimitError({ code: "bad_request", message: "", status: 400, retryable: false })).toBe(false);
  });
});
