import { describe, expect, test } from "bun:test";
import type { ProviderAdapter } from "../../../src/core/provider/adapter.js";
import { AdapterRegistry } from "../../../src/core/provider/registry.js";

const mockAdapter: ProviderAdapter = {
  type: "mock",
  createRequest: (params) => ({ url: "http://test", headers: {}, body: params }),
  parseSSEChunk: (chunk) => ({ content: chunk, done: false }),
  parseError: (res) => ({ code: "TEST", message: "test error", status: res.status, retryable: false }),
  isRateLimitError: () => false,
};

const mockAdapter2: ProviderAdapter = {
  type: "mock2",
  createRequest: (params) => ({ url: "http://test2", headers: {}, body: params }),
  parseSSEChunk: (chunk) => ({ content: chunk, done: false }),
  parseError: (res) => ({ code: "TEST2", message: "test error 2", status: res.status, retryable: false }),
  isRateLimitError: () => false,
};

describe("AdapterRegistry", () => {
  test("register and retrieve adapter", () => {
    const registry = new AdapterRegistry();
    registry.register(mockAdapter);
    expect(registry.get("mock")).toBe(mockAdapter);
    expect(registry.has("mock")).toBe(true);
  });

  test("throws on unknown type", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.get("nonexistent")).toThrow('Unknown adapter type: "nonexistent"');
  });

  test("can register multiple adapter types", () => {
    const registry = new AdapterRegistry();
    registry.register(mockAdapter);
    registry.register(mockAdapter2);
    expect(registry.get("mock")).toBe(mockAdapter);
    expect(registry.get("mock2")).toBe(mockAdapter2);
    expect(registry.has("mock")).toBe(true);
    expect(registry.has("mock2")).toBe(true);
    expect(registry.has("nonexistent")).toBe(false);
  });
});
