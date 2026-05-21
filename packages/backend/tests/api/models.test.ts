import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createMemoryDb } from "../../src/db/connection.js";
import { authTokens } from "../../src/db/schema/auth_tokens.js";
import { providers } from "../../src/db/schema/providers.js";
import { models } from "../../src/db/schema/models.js";
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

describe("Models CRUD", () => {
  let db: ReturnType<typeof setupDb>;
  let authToken: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    authToken = "test-admin-token-for-models";
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

  function insertProvider(db: ReturnType<typeof setupDb>, id = crypto.randomUUID()) {
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

  // --- Real model tests ---

  test("createReal: creates real model with user-chosen id", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    const created = await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
    });

    expect(created.id).toBe("gpt-4");
    expect(created.type).toBe("real");
    expect(created.providerId).toBe(providerId);
    expect(created.providerModel).toBe("gpt-4");
    expect(created.displayName).toBe("gpt-4"); // defaults to id
  });

  test("createReal: with custom displayName", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    const created = await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
      displayName: "GPT-4 Turbo",
    });

    expect(created.displayName).toBe("GPT-4 Turbo");
  });

  test("createReal: rejects non-existent provider", async () => {
    const caller = createCaller();

    await expect(
      caller.models.createReal({
        id: "gpt-4",
        providerId: "non-existent",
        providerModel: "gpt-4",
      }),
    ).rejects.toThrow("PROVIDER_NOT_FOUND");
  });

  test("createReal: rejects duplicate id", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
    });

    await expect(
      caller.models.createReal({
        id: "gpt-4",
        providerId,
        providerModel: "gpt-4-turbo",
      }),
    ).rejects.toThrow("DUPLICATE_ID");
  });

  // --- Virtual fallback model tests ---

  test("createVirtualFallback: creates fallback model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({
      id: "model-a",
      providerId,
      providerModel: "gpt-4",
    });
    await caller.models.createReal({
      id: "model-b",
      providerId,
      providerModel: "claude-3",
    });

    const created = await caller.models.createVirtualFallback({
      id: "fallback-1",
      fallbackChain: ["model-a", "model-b"],
    });

    expect(created.id).toBe("fallback-1");
    expect(created.type).toBe("virtual");
    expect(created.variant).toBe("fallback");
    expect(created.fallbackChain).toEqual(["model-a", "model-b"]);
  });

  test("createVirtualFallback: rejects non-existent model in chain", async () => {
    const caller = createCaller();

    await expect(
      caller.models.createVirtualFallback({
        id: "fallback-1",
        fallbackChain: ["non-existent"],
      }),
    ).rejects.toThrow("MODEL_NOT_FOUND");
  });

  test("createVirtualFallback: detects circular dependency", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    // Create real models for initial valid chains
    await caller.models.createReal({ id: "real-a", providerId, providerModel: "gpt-4" });
    await caller.models.createReal({ id: "real-b", providerId, providerModel: "claude-3" });

    // Create fb-a and fb-b with valid chains
    await caller.models.createVirtualFallback({
      id: "fb-a",
      fallbackChain: ["real-a"],
    });
    await caller.models.createVirtualFallback({
      id: "fb-b",
      fallbackChain: ["real-b"],
    });

    // Make fb-a reference fb-b → fb-a → fb-b → real-b (ok so far)
    await caller.models.update({
      id: "fb-a",
      fallbackChain: ["fb-b"],
    });

    // Now try to make fb-b reference fb-a → circular: fb-b → fb-a → fb-b
    await expect(
      caller.models.update({
        id: "fb-b",
        fallbackChain: ["fb-a"],
      }),
    ).rejects.toThrow("CIRCULAR_DEPENDENCY");
  });

  test("createVirtualFallback: self-reference detected as circular", async () => {
    const caller = createCaller();

    await expect(
      caller.models.createVirtualFallback({
        id: "self-ref",
        fallbackChain: ["self-ref"],
      }),
    ).rejects.toThrow("CIRCULAR_DEPENDENCY");
  });

  // --- Virtual tuned model tests ---

  test("createVirtualTuned: creates tuned model based on real model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
    });

    const created = await caller.models.createVirtualTuned({
      id: "gpt-4-turbo",
      baseModelId: "gpt-4",
      overrides: { temperature: 0.7 },
    });

    expect(created.id).toBe("gpt-4-turbo");
    expect(created.type).toBe("virtual");
    expect(created.variant).toBe("tuned");
    expect(created.baseModelId).toBe("gpt-4");
    expect(created.overrides).toEqual({ temperature: 0.7 });
  });

  test("createVirtualTuned: allows tuned model based on another tuned model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
    });

    await caller.models.createVirtualTuned({
      id: "gpt-4-tuned-1",
      baseModelId: "gpt-4",
      overrides: { temperature: 0.5 },
    });

    const created = await caller.models.createVirtualTuned({
      id: "gpt-4-tuned-2",
      baseModelId: "gpt-4-tuned-1",
      overrides: { top_p: 0.9 },
    });

    expect(created.baseModelId).toBe("gpt-4-tuned-1");
    expect(created.overrides).toEqual({ top_p: 0.9 });
  });

  test("createVirtualTuned: rejects fallback model as base", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({
      id: "model-a",
      providerId,
      providerModel: "gpt-4",
    });

    await caller.models.createVirtualFallback({
      id: "fallback-1",
      fallbackChain: ["model-a"],
    });

    await expect(
      caller.models.createVirtualTuned({
        id: "tuned-on-fallback",
        baseModelId: "fallback-1",
      }),
    ).rejects.toThrow("INVALID_BASE_MODEL");
  });

  test("createVirtualTuned: rejects non-existent base model", async () => {
    const caller = createCaller();

    await expect(
      caller.models.createVirtualTuned({
        id: "tuned-1",
        baseModelId: "non-existent",
      }),
    ).rejects.toThrow("BASE_MODEL_NOT_FOUND");
  });

  // --- List / Get ---

  test("list: returns all models", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });
    await caller.models.createReal({ id: "claude-3", providerId, providerModel: "claude-3" });

    const list = await caller.models.list();
    expect(list.length).toBe(2);
  });

  test("get: returns single model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });

    const got = await caller.models.get({ id: "gpt-4" });
    expect(got.id).toBe("gpt-4");
    expect(got.type).toBe("real");
  });

  test("get: throws NOT_FOUND for missing model", async () => {
    const caller = createCaller();
    await expect(caller.models.get({ id: "non-existent" })).rejects.toThrow("NOT_FOUND");
  });

  // --- Update ---

  test("update: real model fields", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });

    const updated = await caller.models.update({
      id: "gpt-4",
      displayName: "GPT-4 Turbo",
      providerModel: "gpt-4-turbo",
    });

    expect(updated.displayName).toBe("GPT-4 Turbo");
    if (updated.type === "real") {
      expect(updated.providerModel).toBe("gpt-4-turbo");
    }
  });

  test("update: virtual fallback chain", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "model-a", providerId, providerModel: "gpt-4" });
    await caller.models.createReal({ id: "model-b", providerId, providerModel: "claude-3" });

    await caller.models.createVirtualFallback({
      id: "fallback-1",
      fallbackChain: ["model-a"],
    });

    const updated = await caller.models.update({
      id: "fallback-1",
      fallbackChain: ["model-a", "model-b"],
    });

    if (updated.type === "virtual" && updated.variant === "fallback") {
      expect(updated.fallbackChain).toEqual(["model-a", "model-b"]);
    }
  });

  test("update: virtual tuned fields", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });
    await caller.models.createVirtualTuned({
      id: "tuned-1",
      baseModelId: "gpt-4",
      overrides: { temperature: 0.5 },
    });

    const updated = await caller.models.update({
      id: "tuned-1",
      overrides: { temperature: 0.9 },
    });

    if (updated.type === "virtual" && updated.variant === "tuned") {
      expect(updated.overrides).toEqual({ temperature: 0.9 });
    }
  });

  test("update: throws NOT_FOUND for missing model", async () => {
    const caller = createCaller();
    await expect(
      caller.models.update({ id: "non-existent", displayName: "New Name" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("update: fallback chain re-validates circular", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "real-a", providerId, providerModel: "gpt-4" });

    await caller.models.createVirtualFallback({
      id: "fb-a",
      fallbackChain: ["real-a"],
    });

    await expect(
      caller.models.update({
        id: "fb-a",
        fallbackChain: ["fb-a"],
      }),
    ).rejects.toThrow("CIRCULAR_DEPENDENCY");
  });

  // --- Delete ---

  test("delete: removes model with no dependents", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });

    const result = await caller.models.delete({ id: "gpt-4" });
    expect(result.success).toBe(true);

    const list = await caller.models.list();
    expect(list.length).toBe(0);
  });

  test("delete: rejects when model has dependents", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });
    await caller.models.createVirtualTuned({
      id: "tuned-1",
      baseModelId: "gpt-4",
    });

    await expect(caller.models.delete({ id: "gpt-4" })).rejects.toThrow("HAS_DEPENDENTS");
  });

  test("delete: rejects when model referenced in fallback chain", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "model-a", providerId, providerModel: "gpt-4" });
    await caller.models.createVirtualFallback({
      id: "fallback-1",
      fallbackChain: ["model-a"],
    });

    await expect(caller.models.delete({ id: "model-a" })).rejects.toThrow("HAS_DEPENDENTS");
  });

  test("delete: throws NOT_FOUND for missing model", async () => {
    const caller = createCaller();
    await expect(caller.models.delete({ id: "non-existent" })).rejects.toThrow("NOT_FOUND");
  });

  // --- testResolution ---

  test("testResolution: resolves real model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });

    const result = await caller.models.testResolution({ id: "gpt-4" });
    expect(result.steps.length).toBe(1);
    expect(result.steps[0]!.modelId).toBe("gpt-4");
    expect(result.steps[0]!.providerId).toBe(providerId);
    expect(result.steps[0]!.providerModel).toBe("gpt-4");
    expect(result.steps[0]!.adapterType).toBe("openai");
  });

  test("testResolution: resolves tuned model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "gpt-4", providerId, providerModel: "gpt-4" });
    await caller.models.createVirtualTuned({
      id: "gpt-4-turbo",
      baseModelId: "gpt-4",
      overrides: { temperature: 0.7 },
    });

    const result = await caller.models.testResolution({ id: "gpt-4-turbo" });
    expect(result.steps[0]!.providerId).toBe(providerId);
    expect(result.steps[0]!.providerModel).toBe("gpt-4");
  });

  test("testResolution: resolves fallback model", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    await caller.models.createReal({ id: "model-a", providerId, providerModel: "gpt-4" });
    await caller.models.createVirtualFallback({
      id: "fallback-1",
      fallbackChain: ["model-a"],
    });

    const result = await caller.models.testResolution({ id: "fallback-1" });
    expect(result.steps[0]!.providerId).toBe(providerId);
    expect(result.steps[0]!.providerModel).toBe("gpt-4");
  });

  // --- Full lifecycle ---

  test("full lifecycle: create real → create tuned → create fallback → update → delete", async () => {
    const caller = createCaller();
    const providerId = insertProvider(db);

    // Create real models
    const real1 = await caller.models.createReal({
      id: "gpt-4",
      providerId,
      providerModel: "gpt-4",
      displayName: "GPT-4",
    });
    expect(real1.type).toBe("real");

    const real2 = await caller.models.createReal({
      id: "claude-3",
      providerId,
      providerModel: "claude-3-opus",
      displayName: "Claude 3",
    });

    // Create tuned model
    const tuned = await caller.models.createVirtualTuned({
      id: "gpt-4-turbo",
      baseModelId: "gpt-4",
      overrides: { temperature: 0.7 },
    });
    expect(tuned.type).toBe("virtual");

    // Create fallback model
    const fallback = await caller.models.createVirtualFallback({
      id: "auto-fallback",
      fallbackChain: ["gpt-4", "claude-3"],
      displayName: "Auto Fallback",
    });
    expect(fallback.type === "virtual" && fallback.variant === "fallback").toBe(true);

    // List should show 4
    const list = await caller.models.list();
    expect(list.length).toBe(4);

    // Update tuned
    const updatedTuned = await caller.models.update({
      id: "gpt-4-turbo",
      overrides: { temperature: 0.9, max_tokens: 4096 },
    });
    if (updatedTuned.type === "virtual" && updatedTuned.variant === "tuned") {
      expect(updatedTuned.overrides).toEqual({ temperature: 0.9, max_tokens: 4096 });
    }

    // Delete fallback (no dependents)
    const deleted = await caller.models.delete({ id: "auto-fallback" });
    expect(deleted.success).toBe(true);

    // Can't delete gpt-4 because tuned-1 depends on it
    await expect(caller.models.delete({ id: "gpt-4" })).rejects.toThrow("HAS_DEPENDENTS");

    // Delete tuned first, then real
    await caller.models.delete({ id: "gpt-4-turbo" });
    await caller.models.delete({ id: "gpt-4" });
    await caller.models.delete({ id: "claude-3" });

    const emptyList = await caller.models.list();
    expect(emptyList.length).toBe(0);
  });
});
