import { describe, expect, test } from "bun:test";
import type { Model, Provider } from "@rel-ai/shared";
import {
  ModelResolver,
  ModelNotFoundError,
  ProviderNotFoundError,
  CircularDependencyError,
  AllProvidersFailedError,
} from "../../../src/core/model/index.js";

// --- Fixtures ---

const providerA: Provider = {
  id: "p-a",
  name: "Provider A",
  adapterType: "openai",
  baseUrl: "https://api.openai.com",
  apiKey: "key-a",
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const providerB: Provider = {
  id: "p-b",
  name: "Provider B",
  adapterType: "anthropic",
  baseUrl: "https://api.anthropic.com",
  apiKey: "key-b",
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const realModel1: Model = {
  id: "real-1",
  displayName: "GPT-4",
  providerId: "p-a",
  providerModel: "gpt-4",
  type: "real",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const realModel2: Model = {
  id: "real-2",
  displayName: "Claude 3",
  providerId: "p-b",
  providerModel: "claude-3-opus",
  type: "real",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const tunedModel: Model = {
  id: "tuned-1",
  displayName: "GPT-4 Turbo",
  type: "virtual",
  variant: "tuned",
  baseModelId: "real-1",
  overrides: { temperature: 0.5, top_p: 0.9 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

const fallbackModel: Model = {
  id: "fallback-1",
  displayName: "Fallback",
  type: "virtual",
  variant: "fallback",
  fallbackChain: ["real-1", "real-2"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildResolver(models: Model[] = [], providers: Provider[] = []) {
  const modelMap = new Map(models.map((m) => [m.id, m]));
  const providerMap = new Map(providers.map((p) => [p.id, p]));
  return new ModelResolver({
    getModel: (id) => modelMap.get(id),
    getProvider: (id) => providerMap.get(id),
    unhealthyDuration: 1000,
  });
}

// --- Tests ---

describe("ModelResolver", () => {
  test("resolve real model → correct providerId, providerModel, adapterType", () => {
    const resolver = buildResolver([realModel1], [providerA]);
    const result = resolver.resolve("real-1");
    expect(result.providerId).toBe("p-a");
    expect(result.providerModel).toBe("gpt-4");
    expect(result.adapterType).toBe("openai");
    expect(result.overrides).toEqual({});
  });

  test("resolve tuned virtual model → base resolved + overrides merged", () => {
    const resolver = buildResolver([realModel1, tunedModel], [providerA]);
    const result = resolver.resolve("tuned-1");
    expect(result.providerId).toBe("p-a");
    expect(result.providerModel).toBe("gpt-4");
    expect(result.adapterType).toBe("openai");
    expect(result.overrides).toEqual({ temperature: 0.5, top_p: 0.9 });
  });

  test("resolve tuned model with nested overrides → deep merge", () => {
    const baseTuned: Model = {
      id: "tuned-base",
      displayName: "Base Tuned",
      type: "virtual",
      variant: "tuned",
      baseModelId: "real-1",
      overrides: { params: { a: 1, b: 2 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const childTuned: Model = {
      id: "tuned-child",
      displayName: "Child Tuned",
      type: "virtual",
      variant: "tuned",
      baseModelId: "tuned-base",
      overrides: { params: { b: 99, c: 3 } },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const resolver = buildResolver([realModel1, baseTuned, childTuned], [providerA]);
    const result = resolver.resolve("tuned-child");
    // Deep merge: b wins from child (99), a from base (1), c from child (3)
    expect(result.overrides).toEqual({ params: { a: 1, b: 99, c: 3 } });
  });

  test("resolve fallback chain → first healthy provider chosen", () => {
    const resolver = buildResolver([realModel1, realModel2, fallbackModel], [providerA, providerB]);
    const result = resolver.resolve("fallback-1");
    expect(result.providerId).toBe("p-a");
    expect(result.providerModel).toBe("gpt-4");
  });

  test("fallback skips unhealthy providers", () => {
    const resolver = buildResolver([realModel1, realModel2, fallbackModel], [providerA, providerB]);
    resolver.markUnhealthy("p-a");
    const result = resolver.resolve("fallback-1");
    expect(result.providerId).toBe("p-b");
    expect(result.providerModel).toBe("claude-3-opus");
  });

  test("circular fallback detection → throws CircularDependencyError", () => {
    const circularA: Model = {
      id: "circ-a",
      displayName: "Circular A",
      type: "virtual",
      variant: "fallback",
      fallbackChain: ["circ-b"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const circularB: Model = {
      id: "circ-b",
      displayName: "Circular B",
      type: "virtual",
      variant: "fallback",
      fallbackChain: ["circ-a"],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const resolver = buildResolver([circularA, circularB], []);
    expect(() => resolver.resolve("circ-a")).toThrow(CircularDependencyError);
  });

  test("missing model → throws ModelNotFoundError", () => {
    const resolver = buildResolver([], []);
    expect(() => resolver.resolve("nope")).toThrow(ModelNotFoundError);
  });

  test("missing provider → throws ProviderNotFoundError", () => {
    const resolver = buildResolver([realModel1], []); // no providers
    expect(() => resolver.resolve("real-1")).toThrow(ProviderNotFoundError);
  });

  test("all providers unhealthy → throws AllProvidersFailedError", () => {
    const resolver = buildResolver([realModel1, realModel2, fallbackModel], [providerA, providerB]);
    resolver.markUnhealthy("p-a");
    resolver.markUnhealthy("p-b");
    expect(() => resolver.resolve("fallback-1")).toThrow(AllProvidersFailedError);
  });

  test("health expiry works → marked unhealthy then isHealthy returns true after duration", async () => {
    const resolver = buildResolver([], [], 50); // 50ms unhealthy window
    // Rebuild with short duration
    const fastResolver = new ModelResolver({
      getModel: () => undefined,
      getProvider: () => undefined,
      unhealthyDuration: 50,
    });

    fastResolver.markUnhealthy("p-a", 50);
    expect(fastResolver.isHealthy("p-a")).toBe(false);

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 80));

    expect(fastResolver.isHealthy("p-a")).toBe(true);
  });

  test("markUnhealthy with custom duration overrides default", async () => {
    const resolver = new ModelResolver({
      getModel: () => undefined,
      getProvider: () => undefined,
      unhealthyDuration: 60_000, // long default
    });

    resolver.markUnhealthy("p-a", 50); // override with 50ms
    expect(resolver.isHealthy("p-a")).toBe(false);

    await new Promise((r) => setTimeout(r, 80));
    expect(resolver.isHealthy("p-a")).toBe(true);
  });
});
