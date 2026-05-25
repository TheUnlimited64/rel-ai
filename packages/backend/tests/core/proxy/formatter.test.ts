import { describe, expect, test } from "bun:test";
import {
  formatStreamChunk,
  formatStreamDone,
  formatCompletion,
  generateId,
} from "../../../src/core/proxy/formatter.js";
import type { ParsedChunk, TokenUsage } from "../../../src/core/provider/types.js";

describe("formatStreamChunk", () => {
  test("formats basic chunk with content", () => {
    const chunk: ParsedChunk = { content: "Hello", done: false };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    expect(result.startsWith("data: ")).toBe(true);
    expect(result.endsWith("\n\n")).toBe(true);

    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.id).toBe("chatcmpl-test");
    expect(parsed.object).toBe("chat.completion.chunk");
    expect(parsed.model).toBe("gpt-4");
    expect(parsed.choices[0].delta.content).toBe("Hello");
    expect(parsed.choices[0].finish_reason).toBeNull();
  });

  test("preserves tool_calls in delta", () => {
    const chunk: ParsedChunk = {
      tool_calls: [{ index: 0, id: "call_1", type: "function", function: { name: "search", arguments: "" } }],
      done: false,
    };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.choices[0].delta.tool_calls).toBeDefined();
    expect(parsed.choices[0].delta.tool_calls.length).toBe(1);
  });

  test("preserves reasoning_content (thinking)", () => {
    const chunk: ParsedChunk = { thinking: "Let me reason", done: false };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.choices[0].delta.reasoning_content).toBe("Let me reason");
  });

  test("includes usage when present", () => {
    const chunk: ParsedChunk = {
      content: "result",
      done: false,
      usage: { promptTokens: 10, completionTokens: 5 },
    };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.usage).toBeDefined();
    expect(parsed.usage.prompt_tokens).toBe(10);
    expect(parsed.usage.completion_tokens).toBe(5);
    expect(parsed.usage.total_tokens).toBe(15);
  });

  test("sets finish_reason to 'stop' when done with no explicit reason", () => {
    const chunk: ParsedChunk = { content: "done", done: true };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.choices[0].finish_reason).toBe("stop");
  });

  test("uses explicit finish_reason when provided and done", () => {
    const chunk: ParsedChunk = { content: "done", done: true, finish_reason: "tool_calls" };
    const result = formatStreamChunk("chatcmpl-test", "gpt-4", chunk);
    const parsed = JSON.parse(result.slice(6, -2));
    expect(parsed.choices[0].finish_reason).toBe("tool_calls");
  });
});

describe("formatStreamDone", () => {
  test("returns data: [DONE] format", () => {
    expect(formatStreamDone()).toBe("data: [DONE]\n\n");
  });
});

describe("formatCompletion", () => {
  test("formats response with choices and correct structure", () => {
    const usage: TokenUsage = { promptTokens: 20, completionTokens: 10 };
    const result = formatCompletion("chatcmpl-test", "gpt-4", "Hello world", usage);
    const parsed = JSON.parse(result);

    expect(parsed.id).toBe("chatcmpl-test");
    expect(parsed.object).toBe("chat.completion");
    expect(parsed.model).toBe("gpt-4");
    expect(parsed.choices[0].message.role).toBe("assistant");
    expect(parsed.choices[0].message.content).toBe("Hello world");
    expect(parsed.choices[0].finish_reason).toBe("stop");
  });

  test("includes usage in response", () => {
    const usage: TokenUsage = { promptTokens: 30, completionTokens: 15 };
    const result = formatCompletion("chatcmpl-test", "gpt-4", "test", usage);
    const parsed = JSON.parse(result);
    expect(parsed.usage.prompt_tokens).toBe(30);
    expect(parsed.usage.completion_tokens).toBe(15);
    expect(parsed.usage.total_tokens).toBe(45);
  });

  test("preserves model field", () => {
    const usage: TokenUsage = { promptTokens: 5, completionTokens: 5 };
    const result = formatCompletion("chatcmpl-test", "claude-3", "test", usage);
    const parsed = JSON.parse(result);
    expect(parsed.model).toBe("claude-3");
  });

  test("includes tool_calls when provided", () => {
    const usage: TokenUsage = { promptTokens: 10, completionTokens: 5 };
    const toolCalls = [
      { id: "call_1", type: "function" as const, function: { name: "search", arguments: "{}" } },
    ];
    const result = formatCompletion("chatcmpl-test", "gpt-4", null, usage, toolCalls);
    const parsed = JSON.parse(result);
    expect(parsed.choices[0].message.tool_calls).toBeDefined();
    expect(parsed.choices[0].message.tool_calls.length).toBe(1);
    expect(parsed.choices[0].finish_reason).toBe("tool_calls");
  });

  test("uses custom finish_reason when provided", () => {
    const usage: TokenUsage = { promptTokens: 10, completionTokens: 5 };
    const result = formatCompletion("chatcmpl-test", "gpt-4", "test", usage, undefined, "length");
    const parsed = JSON.parse(result);
    expect(parsed.choices[0].finish_reason).toBe("length");
  });

  test("handles null content", () => {
    const usage: TokenUsage = { promptTokens: 10, completionTokens: 0 };
    const result = formatCompletion("chatcmpl-test", "gpt-4", null, usage);
    const parsed = JSON.parse(result);
    expect(parsed.choices[0].message.content).toBeNull();
  });
});

describe("generateId", () => {
  test("generates with chatcmpl- prefix", () => {
    const id = generateId();
    expect(id.startsWith("chatcmpl-")).toBe(true);
  });

  test("unique on each call", () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  test("correct length: chatcmpl- (9) + 32 hex chars", () => {
    const id = generateId();
    expect(id.length).toBe(9 + 32);
  });
});
