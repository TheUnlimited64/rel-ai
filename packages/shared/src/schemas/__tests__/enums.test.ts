import { describe, it, expect } from "bun:test";
import {
  AdapterTypeSchema,
  ModelStatusSchema,
} from "../enums.js";

describe("AdapterTypeSchema", () => {
  it("accepts valid values", () => {
    expect(AdapterTypeSchema.parse("openai")).toBe("openai");
    expect(AdapterTypeSchema.parse("anthropic")).toBe("anthropic");
    expect(AdapterTypeSchema.parse("custom")).toBe("custom");
  });

  it("rejects invalid values", () => {
    expect(() => AdapterTypeSchema.parse("google")).toThrow();
  });
});

describe("ModelStatusSchema", () => {
  it("accepts valid values", () => {
    expect(ModelStatusSchema.parse("success")).toBe("success");
    expect(ModelStatusSchema.parse("error")).toBe("error");
    expect(ModelStatusSchema.parse("rate_limited")).toBe("rate_limited");
  });

  it("rejects invalid values", () => {
    expect(() => ModelStatusSchema.parse("pending")).toThrow();
  });
});
