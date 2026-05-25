import { describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { generateToken, hashToken, maskToken, validateToken, extractBearerToken } from "../../../src/core/auth/token.js";
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

describe("maskToken", () => {
  test("masks long token showing first 3 and last 4 chars", () => {
    const masked = maskToken("abcdef1234567890abcdef1234567890");
    expect(masked).toBe("abc****7890");
  });

  test("does not reveal full token content", () => {
    const token = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";
    const masked = maskToken(token);
    expect(masked).not.toContain(token);
    expect(masked).not.toContain(token.slice(3, -4));
  });

  test("returns **** for tokens 7 chars or shorter", () => {
    expect(maskToken("abcdefg")).toBe("****");
    expect(maskToken("abc")).toBe("****");
    expect(maskToken("")).toBe("****");
  });

  test("masks exactly at 8 char boundary", () => {
    expect(maskToken("abcdefgh")).toBe("abc****efgh");
  });
});

describe("extractBearerToken", () => {
  test("extracts token from valid Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  test("returns null for undefined header", () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  test("returns null for null header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(extractBearerToken("")).toBeNull();
  });

  test("returns null for missing Bearer prefix", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  test("returns null for empty token after Bearer", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
  });

  test("returns null for double-space pattern", () => {
    expect(extractBearerToken("Bearer  token")).toBeNull();
  });

  test("returns null for Bearer only without space", () => {
    expect(extractBearerToken("Bearer")).toBeNull();
  });

  test("extracts token with special characters", () => {
    expect(extractBearerToken("Bearer sk-abc_123.xyz")).toBe("sk-abc_123.xyz");
  });
});
