import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { regenerateApiKey } from "../../../src/core/provider/service.js";
import { resetEncryptionKey, encrypt } from "../../../src/core/auth/encryption.js";
import { createMemoryDb } from "../../../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { providers } from "../../../src/db/schema/providers.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("regenerateApiKey — crypto.getRandomValues usage", () => {
  let db: ReturnType<typeof setupDb>;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    const encrypted = await encrypt("sk-old-key");
    db.insert(providers)
      .values({
        id: "test-provider-id",
        name: "Test",
        adapterType: "openai",
        baseUrl: "https://api.openai.com",
        apiKey: encrypted,
        createdAt: "2026-01-01 00:00:00",
        updatedAt: "2026-01-01 00:00:00",
      })
      .run();
  });

  test("generated key has sk_ prefix and 64 hex chars", async () => {
    const result = await regenerateApiKey(db, "test-provider-id");
    expect(result.apiKeyRaw).toMatch(/^sk_[0-9a-f]{64}$/);
  });

  test("generated keys are unique across calls", async () => {
    const result1 = await regenerateApiKey(db, "test-provider-id");
    const result2 = await regenerateApiKey(db, "test-provider-id");
    expect(result1.apiKeyRaw).not.toBe(result2.apiKeyRaw);
  });

  test("uses crypto.getRandomValues for key generation", async () => {
    const original = crypto.getRandomValues;
    const calls: Uint8Array[] = [];
    crypto.getRandomValues = function (array: Uint8Array) {
      calls.push(array);
      return original.call(crypto, array);
    };

    try {
      await regenerateApiKey(db, "test-provider-id");
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[0]!.length).toBe(32);
    } finally {
      crypto.getRandomValues = original;
    }
  });
});
