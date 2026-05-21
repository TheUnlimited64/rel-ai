import { describe, test, expect, beforeEach } from "bun:test";
import { eq } from "drizzle-orm";
import { createMemoryDb } from "../../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../../src/db/schema/index.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("DB: seed and query", () => {
  const db = setupDb();

  test("insert provider and query back", () => {
    db.insert(schema.providers).values({
      id: "prov-1",
      name: "OpenAI",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-encrypted",
      enabled: true,
    }).run();

    const result = db.select().from(schema.providers).where(eq(schema.providers.id, "prov-1")).get();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("OpenAI");
    expect(result!.adapterType).toBe("openai");
    expect(result!.enabled).toBe(true);
  });

  test("insert auth token and query by tokenHash", () => {
    db.insert(schema.authTokens).values({
      id: "at-1",
      name: "admin-token",
      tokenHash: "hash123",
    }).run();

    const result = db.select().from(schema.authTokens).where(eq(schema.authTokens.id, "at-1")).get();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("admin-token");
    expect(result!.tokenHash).toBe("hash123");
  });

  test("insert endpoint and query by path", () => {
    db.insert(schema.endpoints).values({
      id: "ep-1",
      name: "chat",
      path: "/chat",
      tokenHash: "hash-abc",
      enabled: true,
    }).run();

    const result = db.select().from(schema.endpoints).where(eq(schema.endpoints.path, "/chat")).get();
    expect(result).not.toBeNull();
    expect(result!.name).toBe("chat");
  });
});

describe("DB: foreign key enforcement", () => {
  const db = setupDb();

  test("insert model with invalid provider_id fails", () => {
    expect(() => {
      db.insert(schema.models).values({
        id: "model-1",
        displayName: "GPT-4",
        type: "real",
        providerId: "nonexistent-provider",
        providerModel: "gpt-4",
      }).run();
    }).toThrow();
  });

  test("insert request_log with invalid endpoint_id fails", () => {
    expect(() => {
      db.insert(schema.requestLogs).values({
        id: "rl-1",
        endpointId: "nonexistent-endpoint",
        requestedModel: "gpt-4",
        status: "success",
      }).run();
    }).toThrow();
  });
});

describe("DB: endpoint_models junction CRUD", () => {
  let db: ReturnType<typeof setupDb>;

  beforeEach(() => {
    db = setupDb();
    db.insert(schema.providers).values({
      id: "prov-1",
      name: "OpenAI",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-test",
    }).run();

    db.insert(schema.models).values({
      id: "model-1",
      displayName: "GPT-4",
      type: "real",
      providerId: "prov-1",
      providerModel: "gpt-4",
    }).run();

    db.insert(schema.endpoints).values({
      id: "ep-1",
      name: "chat",
      path: "/chat",
      tokenHash: "hash123",
    }).run();
  });

  test("create endpoint_model link", () => {
    db.insert(schema.endpointModels).values({
      endpointId: "ep-1",
      modelId: "model-1",
    }).run();

    const result = db.select().from(schema.endpointModels).get();
    expect(result).not.toBeNull();
    expect(result!.endpointId).toBe("ep-1");
    expect(result!.modelId).toBe("model-1");
  });

  test("delete endpoint cascades to endpoint_models", () => {
    db.insert(schema.endpointModels).values({
      endpointId: "ep-1",
      modelId: "model-1",
    }).run();

    db.delete(schema.endpoints).where(eq(schema.endpoints.id, "ep-1")).run();

    const remaining = db.select().from(schema.endpointModels).all();
    expect(remaining.length).toBe(0);
  });

  test("delete model cascades to endpoint_models", () => {
    db.insert(schema.endpointModels).values({
      endpointId: "ep-1",
      modelId: "model-1",
    }).run();

    db.delete(schema.models).where(eq(schema.models.id, "model-1")).run();

    const remaining = db.select().from(schema.endpointModels).all();
    expect(remaining.length).toBe(0);
  });

  test("duplicate endpoint_model insert fails (composite PK)", () => {
    db.insert(schema.endpointModels).values({
      endpointId: "ep-1",
      modelId: "model-1",
    }).run();

    expect(() => {
      db.insert(schema.endpointModels).values({
        endpointId: "ep-1",
        modelId: "model-1",
      }).run();
    }).toThrow();
  });
});
