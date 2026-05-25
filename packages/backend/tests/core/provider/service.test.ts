import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";
import { regenerateApiKey, isEncryptedKey, maskApiKey } from "../../../src/core/provider/service.js";
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

describe("isEncryptedKey", () => {
  test("returns true for non-empty string", () => {
    expect(isEncryptedKey("some-value")).toBe(true);
  });

  test("returns true for encrypted key format from encrypt()", async () => {
    resetEncryptionKey();
    const encrypted = await encrypt("sk-test-key");
    expect(isEncryptedKey(encrypted)).toBe(true);
  });

  test("returns false for empty string", () => {
    expect(isEncryptedKey("")).toBe(false);
  });

  test("returns false for null", () => {
    expect(isEncryptedKey(null)).toBe(false);
  });

  test("returns false for undefined", () => {
    expect(isEncryptedKey(undefined)).toBe(false);
  });

  test("returns false for number", () => {
    expect(isEncryptedKey(42)).toBe(false);
  });

  test("returns false for object", () => {
    expect(isEncryptedKey({})).toBe(false);
  });

  test("returns true for string containing enc: prefix", () => {
    expect(isEncryptedKey("enc:something")).toBe(true);
  });

  test("returns true for single character string", () => {
    expect(isEncryptedKey("a")).toBe(true);
  });
});

describe("maskApiKey", () => {
  beforeEach(() => {
    resetEncryptionKey();
  });

  test("masks key showing first 3 chars then ****", async () => {
    const encrypted = await encrypt("sk-abcdefghij");
    const masked = await maskApiKey(encrypted);
    expect(masked).toBe("sk-****");
  });

  test("masks short key (<=3 chars) as ****", async () => {
    const encrypted = await encrypt("abc");
    const masked = await maskApiKey(encrypted);
    expect(masked).toBe("****");
  });

  test("masks single char key as ****", async () => {
    const encrypted = await encrypt("x");
    const masked = await maskApiKey(encrypted);
    expect(masked).toBe("****");
  });

  test("returns **** for empty string", async () => {
    const masked = await maskApiKey("");
    expect(masked).toBe("****");
  });

  test("returns **** for invalid encrypted text", async () => {
    const masked = await maskApiKey("not-valid-encrypted-text");
    expect(masked).toBe("****");
  });

  test("returns consistent format with first 3 chars revealed", async () => {
    const encrypted = await encrypt("pk-live-abc123xyz");
    const masked = await maskApiKey(encrypted);
    expect(masked).toMatch(/^.{3}\*{4}$/);
    expect(masked.startsWith("pk-")).toBe(true);
    expect(masked.endsWith("****")).toBe(true);
  });
});
