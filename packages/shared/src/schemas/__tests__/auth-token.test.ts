import { describe, it, expect } from "bun:test";
import {
  AuthTokenSchema,
  CreateAuthTokenSchema,
} from "../auth-token.js";

const UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const validAuthToken = {
  id: UUID,
  name: "My Token",
  tokenHash: "sha256abc123",
  createdAt: new Date(),
  lastUsedAt: new Date(),
};

describe("AuthTokenSchema", () => {
  it("parses valid auth token", () => {
    const result = AuthTokenSchema.parse(validAuthToken);
    expect(result.name).toBe("My Token");
  });

  it("accepts without lastUsedAt", () => {
    const { lastUsedAt: _lastUsedAt, ...without } = validAuthToken;
    const result = AuthTokenSchema.parse(without);
    expect(result.lastUsedAt).toBeUndefined();
  });

  it("rejects empty name", () => {
    expect(() =>
      AuthTokenSchema.parse({ ...validAuthToken, name: "" })
    ).toThrow();
  });

  it("rejects invalid UUID", () => {
    expect(() =>
      AuthTokenSchema.parse({ ...validAuthToken, id: "not-uuid" })
    ).toThrow();
  });
});

describe("CreateAuthTokenSchema", () => {
  it("parses valid create input", () => {
    const { id: _id, createdAt: _createdAt, ...createInput } = validAuthToken;
    const result = CreateAuthTokenSchema.parse(createInput);
    expect(result.name).toBe("My Token");
  });

  it("rejects id field", () => {
    const { createdAt: _createdAt2, ...withId } = validAuthToken;
    expect(() => CreateAuthTokenSchema.parse(withId)).toThrow();
  });
});
