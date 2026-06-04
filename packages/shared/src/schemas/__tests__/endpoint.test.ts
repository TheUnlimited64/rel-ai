import { describe, it, expect } from "bun:test";
import {
  EndpointSchema,
  CreateEndpointSchema,
  EndpointPathSchema,
  ENDPOINT_PATH_REGEX,
} from "../endpoint.js";

const UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const validEndpoint = {
  id: UUID,
  name: "My Endpoint",
  path: "my-endpoint",
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
    const { enabled: _enabled, ...without } = validEndpoint;
    const result = EndpointSchema.parse(without);
    expect(result.enabled).toBe(true);
  });

  it("accepts valid paths", () => {
    expect(EndpointSchema.parse({ ...validEndpoint, path: "a" }).path).toBe("a");
    expect(EndpointSchema.parse({ ...validEndpoint, path: "my-path-123" }).path).toBe("my-path-123");
  });

  it("rejects path with leading slash", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "/leading-slash" })
    ).toThrow();
  });

  it("rejects path with uppercase", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "MyEndpoint" })
    ).toThrow();
  });

  it("rejects path with special chars", () => {
    expect(() =>
      EndpointSchema.parse({ ...validEndpoint, path: "my_endpoint" })
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
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...createInput } = validEndpoint;
    const result = CreateEndpointSchema.parse(createInput);
    expect(result.name).toBe("My Endpoint");
  });

  it("rejects id field", () => {
    const { createdAt: _createdAt2, updatedAt: _updatedAt2, ...withId } = validEndpoint;
    expect(() => CreateEndpointSchema.parse(withId)).toThrow();
  });
});

describe("EndpointPathSchema", () => {
  it("accepts valid paths", () => {
    expect(EndpointPathSchema.parse("a").length).toBeTruthy();
    expect(EndpointPathSchema.parse("my-endpoint-123").length).toBeTruthy();
  });

  it("rejects paths with leading slash", () => {
    expect(() => EndpointPathSchema.parse("/leading-slash")).toThrow();
  });

  it("rejects uppercase", () => {
    expect(() => EndpointPathSchema.parse("UPPER")).toThrow();
  });

  it("rejects spaces", () => {
    expect(() => EndpointPathSchema.parse("has space")).toThrow();
  });

  it("rejects underscores", () => {
    expect(() => EndpointPathSchema.parse("has_underscore")).toThrow();
  });

  it("rejects empty", () => {
    expect(() => EndpointPathSchema.parse("")).toThrow();
  });
});

describe("ENDPOINT_PATH_REGEX consistency", () => {
  const validPaths = ["my-endpoint", "a", "test-123", "abc"];
  const invalidPaths = ["/leading-slash", "UPPER", "has space", "under_score", ""];

  it("regex and schema agree on valid paths", () => {
    for (const path of validPaths) {
      expect(ENDPOINT_PATH_REGEX.test(path)).toBe(true);
      expect(() => EndpointPathSchema.parse(path)).not.toThrow();
    }
  });

  it("regex and schema agree on invalid paths", () => {
    for (const path of invalidPaths) {
      expect(ENDPOINT_PATH_REGEX.test(path)).toBe(false);
      expect(() => EndpointPathSchema.parse(path)).toThrow();
    }
  });
});
