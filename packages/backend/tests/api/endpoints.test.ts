import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createMemoryDb } from "../../src/db/connection.js";
import { authTokens } from "../../src/db/schema/auth_tokens.js";
import { endpoints } from "../../src/db/schema/endpoints.js";
import { endpointModels } from "../../src/db/schema/endpoint_models.js";
import { models } from "../../src/db/schema/models.js";
import { providers } from "../../src/db/schema/providers.js";
import { hashToken } from "../../src/core/auth/token.js";
import { resetEncryptionKey } from "../../src/core/auth/encryption.js";
import { appRouter } from "../../src/api/router.js";
import type { tRPCContext } from "../../src/api/context.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("Endpoints CRUD", () => {
  let db: ReturnType<typeof setupDb>;
  let authToken: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    authToken = "test-admin-token-for-endpoints";
    const authTokenHash = await hashToken(authToken);
    db.insert(authTokens)
      .values({
        id: crypto.randomUUID(),
        name: "admin",
        tokenHash: authTokenHash,
      })
      .run();
  });

  function createCaller() {
    const ctx: tRPCContext = { authorized: true, token: authToken, db };
    return appRouter.createCaller(ctx);
  }

  function insertProvider(db: ReturnType<typeof setupDb>) {
    const id = crypto.randomUUID();
    db.insert(providers)
      .values({
        id,
        name: "Test Provider",
        adapterType: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: "encrypted:dummy",
      })
      .run();
    return id;
  }

  function insertModel(db: ReturnType<typeof setupDb>, providerId: string) {
    const id = crypto.randomUUID();
    db.insert(models)
      .values({
        id,
        displayName: "Test Model",
        type: "real",
        providerId,
        providerModel: "gpt-4",
      })
      .run();
    return id;
  }

  test("full CRUD lifecycle: create → list → get → update → delete", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);
    const modelId = insertModel(db, providerId);

    // Create
    const created = await caller.endpoints.create({
      name: "Test Endpoint",
      path: "my-endpoint",
      modelIds: [modelId],
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Endpoint");
    expect(created.path).toBe("my-endpoint");
    expect(created.token).toBeDefined();
    expect(created.token.length).toBe(64); // 32 bytes hex
    expect(created.enabled).toBe(true);

    // List
    const list = await caller.endpoints.list();
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(created.id);
    expect(list[0]!.modelCount).toBe(1);
    // Token not in list
    expect((list[0] as any).token).toBeUndefined();
    expect((list[0] as any).tokenHash).toBeUndefined();

    // Get
    const got = await caller.endpoints.get({ id: created.id });
    expect(got.name).toBe("Test Endpoint");
    expect(got.models.length).toBe(1);
    expect(got.models[0]!.id).toBe(modelId);
    expect((got as any).token).toBeUndefined();
    expect((got as any).tokenHash).toBeUndefined();

    // Update
    const updated = await caller.endpoints.update({
      id: created.id,
      name: "Updated Endpoint",
      enabled: false,
    });
    expect(updated.name).toBe("Updated Endpoint");
    expect(updated.enabled).toBe(false);

    // Delete
    const deleted = await caller.endpoints.delete({ id: created.id });
    expect(deleted.success).toBe(true);

    // Verify gone
    const listAfter = await caller.endpoints.list();
    expect(listAfter.length).toBe(0);
  });

  test("create with duplicate path fails", async () => {
    const caller = createCaller();

    await caller.endpoints.create({
      name: "First",
      path: "same-path",
      modelIds: [],
    });

    await expect(
      caller.endpoints.create({
        name: "Second",
        path: "same-path",
        modelIds: [],
      }),
    ).rejects.toThrow("DUPLICATE_PATH");
  });

  test("regenerate token invalidates old token", async () => {
    const caller = createCaller();

    const created = await caller.endpoints.create({
      name: "Token Test",
      path: "token-test",
      modelIds: [],
    });

    const oldToken = created.token;

    // Regenerate
    const regenerated = await caller.endpoints.regenerateToken({ id: created.id });
    expect(regenerated.token).toBeDefined();
    expect(regenerated.token).not.toBe(oldToken);

    // Verify old hash is gone - check DB directly
    const oldHash = await hashToken(oldToken);
    const newHash = await hashToken(regenerated.token);

    const row = db.select().from(endpoints).where(
      // get by id
    ).get();
    // The endpoint's tokenHash should match the new token, not the old one
    const rowWithId = db.select().from(endpoints).all().find(e => e.id === created.id)!;
    expect(rowWithId.tokenHash).toBe(newHash);
    expect(rowWithId.tokenHash).not.toBe(oldHash);
  });

  test("model list updates work (create with modelIds, update with new modelIds)", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);
    const model1 = insertModel(db, providerId);
    const model2 = insertModel(db, providerId);

    // Create with model1
    const created = await caller.endpoints.create({
      name: "Model Test",
      path: "model-test",
      modelIds: [model1],
    });

    const got1 = await caller.endpoints.get({ id: created.id });
    expect(got1.models.length).toBe(1);
    expect(got1.models[0]!.id).toBe(model1);

    // Update with model2
    const updated = await caller.endpoints.update({
      id: created.id,
      modelIds: [model2],
    });

    expect(updated.models.length).toBe(1);
    expect(updated.models[0]!.id).toBe(model2);

    // Verify via getModels
    const endpointModels_result = await caller.endpoints.getModels({ id: created.id });
    expect(endpointModels_result.length).toBe(1);
    expect(endpointModels_result[0]!.id).toBe(model2);
  });

  test("delete removes junction entries", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);
    const modelId = insertModel(db, providerId);

    const created = await caller.endpoints.create({
      name: "Delete Test",
      path: "delete-test",
      modelIds: [modelId],
    });

    // Verify junction entry exists
    const junctionsBefore = db.select().from(endpointModels).all();
    expect(junctionsBefore.length).toBe(1);

    // Delete
    await caller.endpoints.delete({ id: created.id });

    // Verify junction entries gone
    const junctionsAfter = db.select().from(endpointModels).all();
    expect(junctionsAfter.length).toBe(0);
  });

  test("path validation rejects invalid formats", async () => {
    const caller = createCaller();

    // Uppercase
    await expect(
      caller.endpoints.create({ name: "A", path: "UPPERCASE", modelIds: [] }),
    ).rejects.toThrow();

    // Spaces
    await expect(
      caller.endpoints.create({ name: "A", path: "has space", modelIds: [] }),
    ).rejects.toThrow();

    // Special chars
    await expect(
      caller.endpoints.create({ name: "A", path: "has_underscore", modelIds: [] }),
    ).rejects.toThrow();

    // Leading slash
    await expect(
      caller.endpoints.create({ name: "A", path: "/leading-slash", modelIds: [] }),
    ).rejects.toThrow();

    // Valid
    const valid = await caller.endpoints.create({
      name: "Valid",
      path: "valid-path-123",
      modelIds: [],
    });
    expect(valid.path).toBe("valid-path-123");
  });

  test("path validation on update too", async () => {
    const caller = createCaller();

    const created = await caller.endpoints.create({
      name: "Path Update",
      path: "original",
      modelIds: [],
    });

    await expect(
      caller.endpoints.update({ id: created.id, path: "INVALID_PATH" }),
    ).rejects.toThrow();
  });

  test("get non-existent endpoint throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.endpoints.get({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });

  test("update non-existent endpoint throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(
      caller.endpoints.update({ id: "non-existent-id", name: "New Name" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("delete non-existent endpoint throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.endpoints.delete({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });

  test("regenerateToken non-existent throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.endpoints.regenerateToken({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });

  test("getModels returns models with details", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);
    const modelId = insertModel(db, providerId);

    const created = await caller.endpoints.create({
      name: "Get Models Test",
      path: "get-models",
      modelIds: [modelId],
    });

    const result = await caller.endpoints.getModels({ id: created.id });
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe(modelId);
    expect(result[0]!.displayName).toBe("Test Model");
    expect(result[0]!.type).toBe("real");
    expect(result[0]!.providerId).toBe(providerId);
  });

  test("getModels non-existent throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.endpoints.getModels({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });
});
