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
      expect(result.headers["x-cli-environment"]).toBe("external");
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
      expect(body.skills).toBe("");
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
      expect(params.system).toBe("Rule one.\n\nRule two.");
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
        finish_reason: "stop",
        done: true,
        usage: { promptTokens: 100, completionTokens: 50 },
        usageMode: "total",
      });
    });

    test("parses finish event without usage", () => {
      const chunk = JSON.stringify({ type: "finish", finishReason: "stop" }) + "\n";
      const result = adapter.parseSSEChunk(chunk);
      expect(result).toEqual({ finish_reason: "stop", done: true });
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

    test("parses finish-step with reason and usage", () => {
      const fresh = new CommandCodeAdapter();
      const chunk = JSON.stringify({ type: "finish-step", finishReason: "tool-calls", usage: { inputTokens: 50, outputTokens: 25 } }) + "\n";
      const result = fresh.parseSSEChunk(chunk);
      expect(result).toEqual({
        finish_reason: "tool_calls",
        usage: { promptTokens: 50, completionTokens: 25 },
        done: false,
      });
    });

    test("parses finish-step with stop reason", () => {
      const fresh = new CommandCodeAdapter();
      const chunk = JSON.stringify({ type: "finish-step", finishReason: "stop" }) + "\n";
      const result = fresh.parseSSEChunk(chunk);
      expect(result).toEqual({ finish_reason: "stop", done: false });
    });

    test("returns null for provider-metadata event", () => {
      const chunk = JSON.stringify({ type: "provider-metadata" }) + "\n";
      expect(adapter.parseSSEChunk(chunk)).toBeNull();
    });

    test("parses tool-call event (non-streaming)", () => {
      const fresh = new CommandCodeAdapter();
      const chunk = JSON.stringify({ type: "tool-call", toolCallId: "tc1", toolName: "search", input: { q: "test" } }) + "\n";
      const result = fresh.parseSSEChunk(chunk);
      expect(result).toEqual({
        tool_calls: [{ index: 0, id: "tc1", type: "function", function: { name: "search", arguments: "{\"q\":\"test\"}" } }],
        done: false,
      });
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

  describe("streamDelimiter", () => {
    test("uses newline delimiter (LDJSON)", () => {
      expect(adapter.streamDelimiter).toBe("\n");
    });
  });

  describe("convertMessages", () => {
    test("converts assistant messages to typed content array", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi there", tool_calls: [{ id: "tc1", type: "function" as const, function: { name: "search", arguments: "{\"q\":\"test\"}" } }] },
          { role: "tool", content: "search result", tool_call_id: "tc1", name: "search" },
        ],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      const messages = params.messages as unknown[];
      const assistantMsg = messages[1] as { role: string; content: unknown[] };
      expect(assistantMsg.role).toBe("assistant");
      expect(Array.isArray(assistantMsg.content)).toBe(true);
      expect(assistantMsg.content.some((p: Record<string, unknown>) => p.type === "text")).toBe(true);
      expect(assistantMsg.content.some((p: Record<string, unknown>) => p.type === "tool-call")).toBe(true);
    });

    test("converts tool messages to typed content array", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "user", content: "Search for X" },
          { role: "assistant", content: null, tool_calls: [{ id: "tc1", type: "function" as const, function: { name: "search", arguments: "{\"q\":\"X\"}" } }] },
          { role: "tool", content: "result data", tool_call_id: "tc1", name: "search" },
        ],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      const messages = params.messages as unknown[];
      const toolMsg = messages[2] as { role: string; content: unknown[] };
      expect(toolMsg.role).toBe("tool");
      expect(Array.isArray(toolMsg.content)).toBe(true);
      expect((toolMsg.content[0] as Record<string, unknown>).type).toBe("tool-result");
    });

    test("filters out unpaired tool calls/results", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "OK", tool_calls: [{ id: "orphan", type: "function" as const, function: { name: "x", arguments: "{}" } }] },
        ],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      const messages = params.messages as unknown[];
      const assistantMsg = messages[1] as { role: string; content: unknown[] };
      expect(assistantMsg.content.some((p: Record<string, unknown>) => p.type === "tool-call")).toBe(false);
    });
  });

  describe("convertTools", () => {
    test("converts OpenAI tools to CC format", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: {
          apiKey: "cc-test-key",
          tools: [{ type: "function", function: { name: "get_weather", description: "Get weather", parameters: { type: "object" } } }],
        },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params.tools).toEqual([{ type: "function", name: "get_weather", description: "Get weather", input_schema: { type: "object" } }]);
    });
  });

  describe("param filtering", () => {
    test("never sends tool_choice in params", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key" },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params).not.toHaveProperty("tool_choice");
    });

    test("does not leak unknown OpenAI params", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key", frequency_penalty: 0.5, presence_penalty: 0.3, top_p: 0.9, n: 1, logprobs: true },
      });

      const body = result.body as Record<string, unknown>;
      const params = body.params as Record<string, unknown>;
      expect(params).not.toHaveProperty("frequency_penalty");
      expect(params).not.toHaveProperty("presence_penalty");
      expect(params).not.toHaveProperty("top_p");
      expect(params).not.toHaveProperty("n");
      expect(params).not.toHaveProperty("logprobs");
    });
  });

  describe("baseUrl handling", () => {
    test("handles baseUrl that already ends with /alpha/generate", () => {
      const result = adapter.createRequest({
        model: "deepseek/deepseek-v4-flash",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
        overrides: { apiKey: "cc-test-key", baseUrl: "https://api.commandcode.ai/alpha/generate" },
      });

      expect(result.url).toBe("https://api.commandcode.ai/alpha/generate");
    });
  });

  describe("success:false rejection", () => {
    test("throws on success:false chunk from CC", () => {
      const chunk = JSON.stringify({ success: false, error: { message: "Invalid params" } }) + "\n";
      expect(() => adapter.parseSSEChunk(chunk)).toThrow("Invalid params");
    });

    test("throws on success:false with string error", () => {
      const chunk = JSON.stringify({ success: false, error: "Bad request" }) + "\n";
      expect(() => adapter.parseSSEChunk(chunk)).toThrow("Bad request");
    });
  });

  describe("tool-call streaming (tool-input-start/delta/end)", () => {
    // All tool-input-* events are suppressed. Reasons:
    // 1. tool-input-delta: CC can emit delta values with literal unescaped newlines,
    //    splitting the NDJSON line mid-value → bytes dropped → corrupt argument JSON.
    // 2. tool-input-start without a guaranteed tool-call follow-up leaves the client
    //    with a call that has a name but empty arguments → malformed tool invocation.
    // The tool-call event carries the complete, verified arguments and is the only
    // reliable source.

    test("tool-input-start is suppressed", () => {
      const fresh = new CommandCodeAdapter();
      expect(fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-start", id: "call_abc", toolName: "search" }) + "\n")).toBeNull();
    });

    test("tool-input-delta is suppressed", () => {
      const fresh = new CommandCodeAdapter();
      expect(fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-delta", id: "call_abc", delta: "{\"q\":" }) + "\n")).toBeNull();
    });

    test("tool-input-end is suppressed", () => {
      const fresh = new CommandCodeAdapter();
      expect(fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-end", id: "call_abc" }) + "\n")).toBeNull();
    });

    test("tool-call emits complete tool call atomically regardless of preceding start/delta/end", () => {
      const fresh = new CommandCodeAdapter();
      // All tool-input-* suppressed
      fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-start", id: "call_1", toolName: "task" }) + "\n");
      fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-delta", id: "call_1", delta: "{\"subagent\":" }) + "\n");
      fresh.parseSSEChunk(JSON.stringify({ type: "tool-input-end", id: "call_1" }) + "\n");

      const tc = JSON.stringify({ type: "tool-call", toolCallId: "call_1", toolName: "task", input: { subagent: "explore" } }) + "\n";
      expect(fresh.parseSSEChunk(tc)).toEqual({
        tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "task", arguments: "{\"subagent\":\"explore\"}" } }],
        done: false,
      });

      expect(fresh.parseSSEChunk(JSON.stringify({ type: "finish-step", finishReason: "tool-calls" }) + "\n")).toEqual({
        finish_reason: "tool_calls",
        done: false,
      });
    });

    test("multiple concurrent tool-calls get sequential indices", () => {
      const fresh = new CommandCodeAdapter();
      const tc1 = JSON.stringify({ type: "tool-call", toolCallId: "call_a", toolName: "search", input: { q: "hello" } }) + "\n";
      const tc2 = JSON.stringify({ type: "tool-call", toolCallId: "call_b", toolName: "read", input: { path: "/tmp" } }) + "\n";

      expect(fresh.parseSSEChunk(tc1)).toEqual({
        tool_calls: [{ index: 0, id: "call_a", type: "function", function: { name: "search", arguments: "{\"q\":\"hello\"}" } }],
        done: false,
      });
      expect(fresh.parseSSEChunk(tc2)).toEqual({
        tool_calls: [{ index: 1, id: "call_b", type: "function", function: { name: "read", arguments: "{\"path\":\"/tmp\"}" } }],
        done: false,
      });
    });
  });

  describe("resetStreamState", () => {
    test("clears tool call index between streams", () => {
      const fresh = new CommandCodeAdapter();
      fresh.parseSSEChunk(JSON.stringify({ type: "tool-call", toolCallId: "call_1", toolName: "search", input: {} }) + "\n");
      fresh.resetStreamState();
      const result = fresh.parseSSEChunk(JSON.stringify({ type: "tool-call", toolCallId: "call_2", toolName: "read", input: {} }) + "\n");
      expect(result).toEqual({
        tool_calls: [{ index: 0, id: "call_2", type: "function", function: { name: "read", arguments: "{}" } }],
        done: false,
      });
    });
  });
});
