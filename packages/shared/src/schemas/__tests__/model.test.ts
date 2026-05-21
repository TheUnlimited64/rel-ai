import { describe, it, expect } from "bun:test";
import {
  RealModelSchema,
  VirtualModelSchema,
  ModelSchema,
  CreateRealModelSchema,
  CreateVirtualModelSchema,
  CreateModelSchema,
} from "../model.js";

const UUID = "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";

const validRealModel = {
  id: "model-real-1",
  displayName: "GPT-4o",
  providerId: UUID,
  providerModel: "gpt-4o",
  type: "real" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const validVirtualModel = {
  id: "model-virtual-1",
  displayName: "Fallback Model",
  type: "virtual" as const,
  variant: "fallback" as const,
  fallbackChain: ["real-1", "real-2"],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("RealModelSchema", () => {
  it("parses valid real model", () => {
    const result = RealModelSchema.parse(validRealModel);
    expect(result.type).toBe("real");
    expect(result.providerModel).toBe("gpt-4o");
  });

  it("rejects wrong type literal", () => {
    expect(() =>
      RealModelSchema.parse({ ...validRealModel, type: "virtual" })
    ).toThrow();
  });
});

describe("VirtualModelSchema", () => {
  it("parses valid virtual model", () => {
    const result = VirtualModelSchema.parse(validVirtualModel);
    expect(result.type).toBe("virtual");
    expect(result.variant).toBe("fallback");
  });

  it("accepts tuned variant with overrides", () => {
    const tuned = {
      ...validVirtualModel,
      variant: "tuned" as const,
      baseModelId: "real-1",
      overrides: { temperature: 0.5 },
    };
    const result = VirtualModelSchema.parse(tuned);
    expect(result.variant).toBe("tuned");
  });

  it("rejects invalid variant", () => {
    expect(() =>
      VirtualModelSchema.parse({ ...validVirtualModel, variant: "roundrobin" })
    ).toThrow();
  });
});

describe("ModelSchema (discriminated union)", () => {
  it("parses real model via union", () => {
    const result = ModelSchema.parse(validRealModel);
    expect(result.type).toBe("real");
  });

  it("parses virtual model via union", () => {
    const result = ModelSchema.parse(validVirtualModel);
    expect(result.type).toBe("virtual");
  });

  it("rejects object without type discriminant", () => {
    expect(() => {
      const { type, ...noType } = validRealModel;
      ModelSchema.parse(noType);
    }).toThrow();
  });

  it("rejects unknown type value", () => {
    expect(() =>
      ModelSchema.parse({ ...validRealModel, type: "hybrid" })
    ).toThrow();
  });
});

describe("CreateRealModelSchema", () => {
  it("parses valid create input", () => {
    const { id, createdAt, updatedAt, ...createInput } = validRealModel;
    const result = CreateRealModelSchema.parse(createInput);
    expect(result.type).toBe("real");
    expect(result.providerModel).toBe("gpt-4o");
  });

  it("rejects id field", () => {
    const { createdAt, updatedAt, ...withId } = validRealModel;
    expect(() => CreateRealModelSchema.parse(withId)).toThrow();
  });
});

describe("CreateVirtualModelSchema", () => {
  it("parses valid create input", () => {
    const { id, createdAt, updatedAt, ...createInput } = validVirtualModel;
    const result = CreateVirtualModelSchema.parse(createInput);
    expect(result.type).toBe("virtual");
  });

  it("rejects id field", () => {
    const { createdAt, updatedAt, ...withId } = validVirtualModel;
    expect(() => CreateVirtualModelSchema.parse(withId)).toThrow();
  });
});

describe("CreateModelSchema (discriminated union)", () => {
  it("parses create real model", () => {
    const { id, createdAt, updatedAt, ...createInput } = validRealModel;
    const result = CreateModelSchema.parse(createInput);
    expect(result.type).toBe("real");
  });

  it("parses create virtual model", () => {
    const { id, createdAt, updatedAt, ...createInput } = validVirtualModel;
    const result = CreateModelSchema.parse(createInput);
    expect(result.type).toBe("virtual");
  });
});
