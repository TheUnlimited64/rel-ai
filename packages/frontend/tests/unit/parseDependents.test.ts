import { describe, expect, it } from "vitest";
import { parseDependents } from "../../src/features/models/useModels";

describe("parseDependents", () => {
  it("returns dependents from structured error data", () => {
    const err = {
      message: "HAS_DEPENDENTS",
      data: { dependents: ["model-a", "model-b"] },
    };
    expect(parseDependents(err)).toEqual(["model-a", "model-b"]);
  });

  it("returns single dependent", () => {
    const err = {
      message: "HAS_DEPENDENTS",
      data: { dependents: ["tuned-1"] },
    };
    expect(parseDependents(err)).toEqual(["tuned-1"]);
  });

  it("returns null for error without data", () => {
    const err = new Error("SOME_OTHER_ERROR");
    expect(parseDependents(err)).toBeNull();
  });

  it("returns null for null error", () => {
    expect(parseDependents(null)).toBeNull();
  });

  it("returns null for undefined error", () => {
    expect(parseDependents(undefined)).toBeNull();
  });

  it("returns null for error with data but no dependents", () => {
    const err = { message: "CONFLICT", data: { code: "CONFLICT" } };
    expect(parseDependents(err)).toBeNull();
  });

  it("returns null when dependents is not an array", () => {
    const err = { message: "HAS_DEPENDENTS", data: { dependents: "not-array" } };
    expect(parseDependents(err)).toBeNull();
  });

  it("returns null when dependents contains non-strings", () => {
    const err = { message: "HAS_DEPENDENTS", data: { dependents: ["ok", 42] } };
    expect(parseDependents(err)).toBeNull();
  });

  it("returns empty array when dependents is empty", () => {
    const err = { message: "HAS_DEPENDENTS", data: { dependents: [] } };
    expect(parseDependents(err)).toEqual([]);
  });

  it("handles model IDs with hyphens and numbers", () => {
    const err = {
      message: "HAS_DEPENDENTS",
      data: { dependents: ["gpt-4-turbo", "claude-3-opus"] },
    };
    expect(parseDependents(err)).toEqual(["gpt-4-turbo", "claude-3-opus"]);
  });

  it("ignores legacy string-encoded format in message", () => {
    const err = new Error("HAS_DEPENDENTS:model-a,model-b");
    expect(parseDependents(err)).toBeNull();
  });

  it("handles tRPC error shape with code in data", () => {
    const err = {
      message: "HAS_DEPENDENTS",
      data: { code: "PRECONDITION_FAILED", dependents: ["model-x"] },
    };
    expect(parseDependents(err)).toEqual(["model-x"]);
  });
});
