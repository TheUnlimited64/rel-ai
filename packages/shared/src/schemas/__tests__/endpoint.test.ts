import { describe, it, expect } from "bun:test";
import {
  EndpointSchema,
  CreateEndpointSchema,
} from "../endpoint.js";

const UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const validEndpoint = {
  id: UUID,
  name: "My Endpoint",
  path: "/my-endpoint",
  token: "tok-abc123",
  models: ["gpt-4", "claude-3"],
  enabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("EndpointSchema", () => {
  it("parses valid endpoint", () => {
    const result = EndpointSchema.parse(validEndpoint);
    expect(result.name).toBe("My Endpoint");
  });

  it("applies default for enabled", () => {
    const { enabled, ...without } = validEndpoint;
    const result = EndpointSchema.parse(without);
    expect(result.enabled).toBe(true);
  });

  it("accepts valid paths", () => {
    expect(EndpointSchema.parse({ ...validEndpoint, path: "/a" }).path).toBe("/a");
    expect(EndpointSchema.parse({ ...validEndpoint, path: "/my-path-123" }).path).toBe("/my-path-123");
  });

  it("rejects path without leading slash", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "no-slash" })
    ).toThrow();
  });

  it("rejects path with uppercase", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "/MyEndpoint" })
    ).toThrow();
  });

  it("rejects path with special chars", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "/my_endpoint" })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, name: "" })
    ).toThrow();
  });
});

describe("CreateEndpointSchema", () => {
  it("parses valid create input", () => {
    const { id, createdAt, updatedAt, ...createInput } = validEndpoint;
    const result = CreateEndpointSchema.parse(createInput);
    expect(result.name).toBe("My Endpoint");
  });

  it("rejects id field", () => {
    const { createdAt, updatedAt, ...withId } = validEndpoint;
    expect(() => CreateEndpointSchema.parse(withId)).toThrow();
  });
});
