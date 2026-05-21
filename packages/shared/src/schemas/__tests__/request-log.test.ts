import { describe, it, expect } from "bun:test";
import {
  RequestLogSchema,
  CreateRequestLogSchema,
} from "../request-log.js";

const UUID1 = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const UUID2 = "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e";
const UUID3 = "c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f";

const validRequestLog = {
  id: UUID1,
  endpointId: UUID2,
  requestedModel: "gpt-4",
  resolvedModel: "gpt-4o",
  providerId: UUID3,
  promptTokens: 100,
  completionTokens: 50,
  latencyMs: 1200,
  status: "success" as const,
  errorDetail: undefined,
  createdAt: new Date(),
};

describe("RequestLogSchema", () => {
  it("parses valid request log", () => {
    const result = RequestLogSchema.parse(validRequestLog);
    expect(result.status).toBe("success");
    expect(result.promptTokens).toBe(100);
  });

  it("accepts minimal input", () => {
    const minimal = {
      id: UUID1,
      endpointId: UUID2,
      requestedModel: "gpt-4",
      status: "error" as const,
      createdAt: new Date(),
    };
    const result = RequestLogSchema.parse(minimal);
    expect(result.resolvedModel).toBeUndefined();
  });

  it("rejects negative tokens", () => {
    expect(() =>
      RequestLogSchema.parse({ ...validRequestLog, promptTokens: -1 })
    ).toThrow();
  });

  it("rejects negative latency", () => {
    expect(() =>
      RequestLogSchema.parse({ ...validRequestLog, latencyMs: -1 })
    ).toThrow();
  });

  it("rejects fractional latency", () => {
    expect(() =>
      RequestLogSchema.parse({ ...validRequestLog, latencyMs: 1.5 })
    ).toThrow();
  });

  it("rejects invalid status", () => {
    expect(() =>
      RequestLogSchema.parse({ ...validRequestLog, status: "pending" })
    ).toThrow();
  });

  it("accepts error with detail", () => {
    const err = { ...validRequestLog, status: "error" as const, errorDetail: "timeout" };
    const result = RequestLogSchema.parse(err);
    expect(result.errorDetail).toBe("timeout");
  });
});

describe("CreateRequestLogSchema", () => {
  it("parses valid create input", () => {
    const { id, createdAt, ...createInput } = validRequestLog;
    const result = CreateRequestLogSchema.parse(createInput);
    expect(result.requestedModel).toBe("gpt-4");
  });

  it("rejects id field", () => {
    const { createdAt, ...withId } = validRequestLog;
    expect(() => CreateRequestLogSchema.parse(withId)).toThrow();
  });
});
