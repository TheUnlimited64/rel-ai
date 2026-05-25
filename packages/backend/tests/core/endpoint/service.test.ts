import { describe, expect, test, beforeEach } from "bun:test";
import { createMemoryDb } from "../../../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { providers } from "../../../src/db/schema/providers.js";
import { models } from "../../../src/db/schema/models.js";
import {
  createEndpoint,
  listEndpoints,
  getEndpoint,
  updateEndpoint,
  deleteEndpoint,
  regenerateEndpointToken,
  getEndpointModels,
} from "../../../src/core/endpoint/service.js";
import { encrypt, resetEncryptionKey } from "../../../src/core/auth/encryption.js";
import type { DbClient } from "../../../src/db/connection.js";

function setupDb(): DbClient {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

async function seedProviderAndModel(db: DbClient): Promise<{ providerId: string; modelId: string }> {
  resetEncryptionKey();
  const encrypted = await encrypt("sk-test-key");
  const providerId = "test-provider-id";
  const modelId = "test-model-id";

  db.insert(providers)
    .values({
      id: providerId,
      name: "Test Provider",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: encrypted,
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
    })
    .run();

  db.insert(models)
    .values({
      id: modelId,
      displayName: "GPT-4",
      type: "real",
      providerId,
      providerModel: "gpt-4",
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
    })
    .run();

  return { providerId, modelId };
}

describe("validatePath (via createEndpoint)", () => {
  let db: DbClient;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    await seedProviderAndModel(db);
  });

  test("accepts valid path: my-endpoint", async () => {
    const result = await createEndpoint(db, {
      name: "Test",
      path: "my-endpoint",
      modelIds: [],
    });
    expect(result.path).toBe("my-endpoint");
  });

  test("accepts valid path: abc123", async () => {
    const result = await createEndpoint(db, {
      name: "Test",
      path: "abc123",
      modelIds: [],
    });
    expect(result.path).toBe("abc123");
  });

  test("accepts valid path: single char a", async () => {
    const result = await createEndpoint(db, {
      name: "Test",
      path: "a",
      modelIds: [],
    });
    expect(result.path).toBe("a");
  });

  test("accepts valid path: test-endpoint-1", async () => {
    const result = await createEndpoint(db, {
      name: "Test",
      path: "test-endpoint-1",
      modelIds: [],
    });
    expect(result.path).toBe("test-endpoint-1");
  });

  test("rejects UPPERCASE", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "UPPERCASE", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects path with spaces", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "with spaces", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects path with underscore", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "with_underscore", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects path with dot", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "with.dot", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects empty string path", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects path with slash", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "with/slash", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });

  test("rejects path with space in name", async () => {
    expect(
      createEndpoint(db, { name: "Test", path: "endpoint name", modelIds: [] }),
    ).rejects.toThrow("INVALID_PATH");
  });
});

describe("endpoint CRUD", () => {
  let db: DbClient;
  let modelId: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    const seeded = await seedProviderAndModel(db);
    modelId = seeded.modelId;
  });

  test("create endpoint with valid data returns created endpoint", async () => {
    const result = await createEndpoint(db, {
      name: "My Endpoint",
      path: "my-ep",
      modelIds: [modelId],
    });
    expect(result.id).toBeDefined();
    expect(result.name).toBe("My Endpoint");
    expect(result.path).toBe("my-ep");
    expect(result.token).toBeDefined();
    expect(result.token.length).toBe(64);
    expect(result.enabled).toBe(true);
    expect(result.proxyBase).toBeDefined();
  });

  test("create endpoint with duplicate path throws DUPLICATE_PATH", async () => {
    await createEndpoint(db, { name: "First", path: "dup-path", modelIds: [] });
    expect(
      createEndpoint(db, { name: "Second", path: "dup-path", modelIds: [] }),
    ).rejects.toThrow("DUPLICATE_PATH");
  });

  test("list endpoints returns all endpoints", async () => {
    await createEndpoint(db, { name: "EP1", path: "ep-1", modelIds: [] });
    await createEndpoint(db, { name: "EP2", path: "ep-2", modelIds: [modelId] });

    const list = await listEndpoints(db);
    expect(list.length).toBe(2);
    expect(list.find((e) => e.path === "ep-1")).toBeDefined();
    expect(list.find((e) => e.path === "ep-2")).toBeDefined();
  });

  test("list endpoints includes modelCount", async () => {
    await createEndpoint(db, { name: "EP", path: "ep-counted", modelIds: [modelId] });
    const list = await listEndpoints(db);
    const ep = list.find((e) => e.path === "ep-counted");
    expect(ep?.modelCount).toBe(1);
  });

  test("get endpoint returns endpoint with models", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-get", modelIds: [modelId] });
    const got = await getEndpoint(db, created.id);
    expect(got.name).toBe("EP");
    expect(got.models.length).toBe(1);
    expect(got.models[0]!.id).toBe(modelId);
  });

  test("get endpoint not found throws NOT_FOUND", async () => {
    expect(getEndpoint(db, "nonexistent-id")).rejects.toThrow("NOT_FOUND");
  });

  test("update endpoint name and path", async () => {
    const created = await createEndpoint(db, { name: "Old", path: "old-path", modelIds: [] });
    const updated = await updateEndpoint(db, {
      id: created.id,
      name: "New",
      path: "new-path",
    });
    expect(updated.name).toBe("New");
    expect(updated.path).toBe("new-path");
  });

  test("update endpoint enabled state", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-toggle", modelIds: [] });
    const updated = await updateEndpoint(db, { id: created.id, enabled: false });
    expect(updated.enabled).toBe(false);
  });

  test("update endpoint with duplicate path throws DUPLICATE_PATH", async () => {
    const ep1 = await createEndpoint(db, { name: "EP1", path: "first-path", modelIds: [] });
    await createEndpoint(db, { name: "EP2", path: "second-path", modelIds: [] });
    expect(
      updateEndpoint(db, { id: ep1.id, path: "second-path" }),
    ).rejects.toThrow("DUPLICATE_PATH");
  });

  test("update endpoint modelIds replaces models", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-models", modelIds: [modelId] });
    const updated = await updateEndpoint(db, { id: created.id, modelIds: [] });
    expect(updated.models.length).toBe(0);
  });

  test("update nonexistent endpoint throws NOT_FOUND", async () => {
    expect(
      updateEndpoint(db, { id: "nonexistent", name: "X" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("delete endpoint removes from list", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-del", modelIds: [] });
    await deleteEndpoint(db, created.id);
    const list = await listEndpoints(db);
    expect(list.length).toBe(0);
  });

  test("delete nonexistent endpoint throws NOT_FOUND", async () => {
    expect(deleteEndpoint(db, "nonexistent")).rejects.toThrow("NOT_FOUND");
  });
});

describe("regenerateEndpointToken", () => {
  let db: DbClient;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    await seedProviderAndModel(db);
  });

  test("generates new token", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-regen", modelIds: [] });
    const regen = await regenerateEndpointToken(db, created.id);
    expect(regen.token).toBeDefined();
    expect(regen.token.length).toBe(64);
    expect(regen.token).not.toBe(created.token);
  });

  test("throws NOT_FOUND for nonexistent endpoint", async () => {
    expect(regenerateEndpointToken(db, "nonexistent")).rejects.toThrow("NOT_FOUND");
  });
});

describe("getEndpointModels", () => {
  let db: DbClient;
  let modelId: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    const seeded = await seedProviderAndModel(db);
    modelId = seeded.modelId;
  });

  test("returns models associated with endpoint", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-models", modelIds: [modelId] });
    const modelList = await getEndpointModels(db, created.id);
    expect(modelList.length).toBe(1);
    expect(modelList[0]!.id).toBe(modelId);
    expect(modelList[0]!.displayName).toBe("GPT-4");
  });

  test("returns empty array for endpoint with no models", async () => {
    const created = await createEndpoint(db, { name: "EP", path: "ep-nomodels", modelIds: [] });
    const modelList = await getEndpointModels(db, created.id);
    expect(modelList.length).toBe(0);
  });

  test("throws NOT_FOUND for nonexistent endpoint", async () => {
    expect(getEndpointModels(db, "nonexistent")).rejects.toThrow("NOT_FOUND");
  });
});
