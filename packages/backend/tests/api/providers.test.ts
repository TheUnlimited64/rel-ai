import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { eq } from "drizzle-orm";
import { createMemoryDb } from "../../src/db/connection.js";
import { authTokens } from "../../src/db/schema/auth_tokens.js";
import { providers } from "../../src/db/schema/providers.js";
import { models } from "../../src/db/schema/models.js";
import { hashToken } from "../../src/core/auth/token.js";
import { resetEncryptionKey, decrypt, encrypt } from "../../src/core/auth/encryption.js";
import { maskApiKey, isEncryptedKey } from "../../src/core/provider/service.js";
import { appRouter } from "../../src/api/router.js";
import type { tRPCContext } from "../../src/api/context.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("Providers CRUD", () => {
  let db: ReturnType<typeof setupDb>;
  let authToken: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    authToken = "test-admin-token-for-providers";
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

  test("full CRUD lifecycle: create → list → get → update → delete", async () => {
    const caller = createCaller();

    // Create
    const created = await caller.providers.create({
      name: "Test Provider",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-proj-abc123",
    });

    expect(created.id).toBeDefined();
    expect(created.name).toBe("Test Provider");
    expect(created.adapterType).toBe("openai");
    expect(created.baseUrl).toBe("https://api.openai.com");
    expect(created.maskedApiKey).toBe("sk-****");
    expect(created.enabled).toBe(true);

    // List
    const list = await caller.providers.list();
    expect(list.length).toBe(1);
    expect(list[0]!.id).toBe(created.id);
    expect(list[0]!.maskedApiKey).toBe("sk-****");

    // Get
    const got = await caller.providers.get({ id: created.id });
    expect(got.name).toBe("Test Provider");
    expect(got.maskedApiKey).toBe("sk-****");

    // Update
    const updated = await caller.providers.update({
      id: created.id,
      name: "Updated Provider",
      enabled: false,
    });
    expect(updated.name).toBe("Updated Provider");
    expect(updated.enabled).toBe(false);
    expect(updated.maskedApiKey).toBe("sk-****"); // key unchanged

    // Delete
    const deleted = await caller.providers.delete({ id: created.id });
    expect(deleted.success).toBe(true);

    // Verify gone
    const listAfter = await caller.providers.list();
    expect(listAfter.length).toBe(0);
  });

  test("create with invalid input fails validation", async () => {
    const caller = createCaller();

    // Missing required fields
    await expect(
      caller.providers.create({
        name: "",
        adapterType: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: "sk-test",
      }),
    ).rejects.toThrow();

    // Invalid adapterType
    await expect(
      caller.providers.create({
        name: "Test",
        adapterType: "invalid" as any,
        baseUrl: "https://api.openai.com",
        apiKey: "sk-test",
      }),
    ).rejects.toThrow();

    // Invalid URL
    await expect(
      caller.providers.create({
        name: "Test",
        adapterType: "openai",
        baseUrl: "not-a-url",
        apiKey: "sk-test",
      }),
    ).rejects.toThrow();
  });

  test("API key is encrypted on create (stored value ≠ input)", async () => {
    const caller = createCaller();
    const plainKey = "sk-super-secret-key-12345";

    const created = await caller.providers.create({
      name: "Encrypted Provider",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: plainKey,
    });

    // Masked key shows first 3 chars
    expect(created.maskedApiKey).toBe("sk-****");

    // Verify stored value in DB is NOT the plaintext key
    const row = db.select().from(providers).get()!;
    expect(row.apiKey).not.toBe(plainKey);
    // Encrypted value should be different format (base64:base64)
    expect(row.apiKey).toContain(":");
  });

  test("API key re-encrypted on update", async () => {
    const caller = createCaller();

    const created = await caller.providers.create({
      name: "Key Rotate",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-old-key-12345",
    });

    const oldEncryptedKey = db.select().from(providers).where(
      // @ts-ignore - drizzle types
    ).get()!.apiKey;

    const updated = await caller.providers.update({
      id: created.id,
      apiKey: "sk-new-key-67890",
    });

    expect(updated.maskedApiKey).toBe("sk-****");

    const newEncryptedKey = db.select().from(providers).get()!.apiKey;
    expect(newEncryptedKey).not.toBe("sk-new-key-67890");
    expect(newEncryptedKey).not.toBe(oldEncryptedKey);
  });

  test("delete cascades to related models", async () => {
    const caller = createCaller();

    // Create provider
    const provider = await caller.providers.create({
      name: "Cascade Test",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-cascade-test",
    });

    // Insert a model with this providerId directly
    db.insert(models)
      .values({
        id: crypto.randomUUID(),
        displayName: "Test Model",
        type: "real",
        providerId: provider.id,
        providerModel: "gpt-4",
      })
      .run();

    // Verify model exists
    const modelsBefore = db.select().from(models).all();
    expect(modelsBefore.length).toBe(1);

    // Delete provider
    await caller.providers.delete({ id: provider.id });

    // Verify model is also deleted
    const modelsAfter = db.select().from(models).all();
    expect(modelsAfter.length).toBe(0);
  });

  test("get non-existent provider throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.providers.get({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });

  test("update non-existent provider throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(
      caller.providers.update({ id: "non-existent-id", name: "New Name" }),
    ).rejects.toThrow("NOT_FOUND");
  });

  test("delete non-existent provider throws NOT_FOUND", async () => {
    const caller = createCaller();
    await expect(caller.providers.delete({ id: "non-existent-id" })).rejects.toThrow("NOT_FOUND");
  });

  test("encrypted API key in DB decrypts to original", async () => {
    const caller = createCaller();
    const plainKey = "sk-roundtrip-test-key-999";

    const created = await caller.providers.create({
      name: "Roundtrip Test",
      adapterType: "openai",
      baseUrl: "https://api.example.com/v1",
      apiKey: plainKey,
    });

    // Read raw row from DB
    const row = db.select().from(providers).where(eq(providers.id, created.id)).get()!;
    // Decrypt and verify
    const decrypted = await decrypt(row.apiKey);
    expect(decrypted).toBe(plainKey);
    // Stored value should NOT be plaintext
    expect(row.apiKey).not.toBe(plainKey);
  });

  test("create with config stores JSON", async () => {
    const caller = createCaller();

    const created = await caller.providers.create({
      name: "Config Provider",
      adapterType: "custom",
      baseUrl: "https://custom.api.com",
      apiKey: "sk-custom-key",
      config: { temperature: 0.7, maxTokens: 4096 },
    });

    // Verify config stored as JSON in DB
    const row = db.select().from(providers).get()!;
    const parsed = JSON.parse(row.config!);
    expect(parsed.temperature).toBe(0.7);
    expect(parsed.maxTokens).toBe(4096);
  });

  test("update without apiKey preserves existing encrypted key", async () => {
    const caller = createCaller();

    const created = await caller.providers.create({
      name: "Key Preserve",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: "sk-preserve-test-12345",
    });

    const originalRow = db.select().from(providers).where(eq(providers.id, created.id)).get()!;

    // Update name only — apiKey not provided
    const updated = await caller.providers.update({
      id: created.id,
      name: "Key Preserve Updated",
    });

    expect(updated.name).toBe("Key Preserve Updated");
    expect(updated.maskedApiKey).toBe("sk-****");

    // Verify encrypted value unchanged in DB
    const updatedRow = db.select().from(providers).where(eq(providers.id, created.id)).get()!;
    expect(updatedRow.apiKey).toBe(originalRow.apiKey);

    // Verify decryption still works
    const decrypted = await decrypt(updatedRow.apiKey);
    expect(decrypted).toBe("sk-preserve-test-12345");
  });

  test("isEncryptedKey type guard validates correctly", () => {
    expect(isEncryptedKey("abc123")).toBe(true);
    expect(isEncryptedKey("a")).toBe(true);
    expect(isEncryptedKey("")).toBe(false);
    expect(isEncryptedKey(null)).toBe(false);
    expect(isEncryptedKey(undefined)).toBe(false);
    expect(isEncryptedKey(123)).toBe(false);
  });

  test("maskApiKey handles empty/falsy encrypted key gracefully", async () => {
    await expect(maskApiKey("")).resolves.toBe("****");
    // Non-encrypted gibberish also falls back gracefully
    await expect(maskApiKey("invalid-ciphertext")).resolves.toBe("****");
    // Valid encrypted key masks correctly
    const encrypted = await encrypt("sk-real-key-123");
    await expect(maskApiKey(encrypted)).resolves.toBe("sk-****");
  });
});
