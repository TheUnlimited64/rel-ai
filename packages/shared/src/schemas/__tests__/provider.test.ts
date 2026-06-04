import { describe, it, expect } from "bun:test";
import {
  ProviderSchema,
  CreateProviderSchema,
} from "../provider.js";

const UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const validProvider = {
  id: UUID,
  name: "Test Provider",
  adapterType: "openai" as const,
  baseUrl: "https://api.openai.com",
  apiKey: "sk-test-key",
  enabled: true,
  config: { temperature: 0.7 },
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ProviderSchema", () => {
  it("parses valid provider", () => {
    const result = ProviderSchema.parse(validProvider);
    expect(result.name).toBe("Test Provider");
    expect(result.adapterType).toBe("openai");
  });

  it("applies default for enabled", () => {
    const { enabled: _enabled, ...without } = validProvider;
    const result = ProviderSchema.parse(without);
    expect(result.enabled).toBe(true);
  });

  it("rejects empty name", () => {
    expect(() =>
      ProviderSchema.parse({ ...validProvider, name: "" })
    ).toThrow();
  });

  it("rejects invalid UUID", () => {
    expect(() =>
      ProviderSchema.parse({ ...validProvider, id: "not-a-uuid" })
    ).toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() =>
      ProviderSchema.parse({ ...validProvider, baseUrl: "not-a-url" })
    ).toThrow();
  });

  it("rejects invalid adapterType", () => {
    expect(() =>
      ProviderSchema.parse({ ...validProvider, adapterType: "google" })
    ).toThrow();
  });
});

describe("CreateProviderSchema", () => {
  it("parses valid create input", () => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...createInput } = validProvider;
    const result = CreateProviderSchema.parse(createInput);
    expect(result.name).toBe("Test Provider");
  });

  it("rejects id field", () => {
    const { createdAt: _createdAt2, updatedAt: _updatedAt2, ...withId } = validProvider;
    expect(() => CreateProviderSchema.parse(withId)).toThrow();
  });

  it("rejects createdAt/updatedAt", () => {
    const { id: _id2, ...withTimestamps } = validProvider;
    expect(() => CreateProviderSchema.parse(withTimestamps)).toThrow();
  });
});
