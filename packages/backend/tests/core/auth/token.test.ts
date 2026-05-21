import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { generateToken, hashToken, validateToken } from "../../../src/core/auth/token.js";
import { createMemoryDb } from "../../../src/db/connection.js";
import { authTokens } from "../../../src/db/schema/auth_tokens.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("generateToken", () => {
  test("generates 64-char hex token", async () => {
    const { token, hash } = await generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("token and hash are different", async () => {
    const { token, hash } = await generateToken();
    expect(token).not.toBe(hash);
  });

  test("generates unique tokens", async () => {
    const results = await Promise.all([generateToken(), generateToken()]);
    expect(results[0].token).not.toBe(results[1].token);
    expect(results[0].hash).not.toBe(results[1].hash);
  });

  test("hash is deterministic for same token", async () => {
    const { token, hash } = await generateToken();
    const recomputedHash = await hashToken(token);
    expect(recomputedHash).toBe(hash);
  });
});

describe("validateToken", () => {
  test("returns token record for valid token", async () => {
    const db = setupDb();
    const { token, hash } = await generateToken();
    const id = crypto.randomUUID();
    db.insert(authTokens).values({ id, name: "test", tokenHash: hash }).run();

    const result = await validateToken(db, token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(id);
    expect(result!.name).toBe("test");
  });

  test("returns null for invalid token", async () => {
    const db = setupDb();
    const result = await validateToken(db, "nonexistent-token");
    expect(result).toBeNull();
  });

  test("updates lastUsedAt on successful validation", async () => {
    const db = setupDb();
    const { token, hash } = await generateToken();
    const id = crypto.randomUUID();
    db.insert(authTokens).values({ id, name: "test", tokenHash: hash }).run();

    const before = db.select().from(authTokens).where(eq(authTokens.id, id)).get();
    expect(before!.lastUsedAt).toBeNull();

    await validateToken(db, token);

    const after = db.select().from(authTokens).where(eq(authTokens.id, id)).get();
    expect(after!.lastUsedAt).not.toBeNull();
  });
});
