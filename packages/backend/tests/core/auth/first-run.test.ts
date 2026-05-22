import { describe, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createMemoryDb } from "../../../src/db/connection.js";
import { authTokens } from "../../../src/db/schema/auth_tokens.js";
import { providers } from "../../../src/db/schema/providers.js";
import { count } from "drizzle-orm";
import { checkFirstRun } from "../../../src/core/auth/first-run.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("checkFirstRun", () => {
  test("returns true on fresh DB (no tokens, no providers)", () => {
    const db = setupDb();
    expect(checkFirstRun(db)).toBe(true);
  });

  test("returns true when tokens exist but no providers", async () => {
    const db = setupDb();
    const { generateToken } = await import("../../../src/core/auth/token.js");
    const { hash } = await generateToken();
    db.insert(authTokens).values({ id: crypto.randomUUID(), name: "Admin", tokenHash: hash }).run();
    expect(checkFirstRun(db)).toBe(true);
  });

  test("returns true when providers exist but no tokens", async () => {
    const db = setupDb();
    const { encrypt } = await import("../../../src/core/auth/encryption.js");
    const encKey = await encrypt("test-key");
    db.insert(providers).values({
      id: crypto.randomUUID(),
      name: "Test",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: encKey,
    }).run();
    expect(checkFirstRun(db)).toBe(true);
  });

  test("returns false when both tokens and providers exist", async () => {
    const db = setupDb();
    const { generateToken } = await import("../../../src/core/auth/token.js");
    const { hash } = await generateToken();
    db.insert(authTokens).values({ id: crypto.randomUUID(), name: "Admin", tokenHash: hash }).run();

    const { encrypt } = await import("../../../src/core/auth/encryption.js");
    const encKey = await encrypt("test-key");
    db.insert(providers).values({
      id: crypto.randomUUID(),
      name: "Test",
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: encKey,
    }).run();

    expect(checkFirstRun(db)).toBe(false);
  });
});

describe("first-run token bootstrap", () => {
  test("auto-creates admin token when no tokens exist", async () => {
    const db = setupDb();
    const [{ count: tokenCount }] = db.select({ count: count() }).from(authTokens).all();
    expect(tokenCount).toBe(0);

    // Simulate first-run check from server.ts (transactional)
    const { generateToken } = await import("../../../src/core/auth/token.js");
    const { token, hash } = await generateToken();
    db.transaction((tx) => {
      const row = tx.select({ count: count() }).from(authTokens).get();
      if (row && row.count === 0) {
        tx.insert(authTokens).values({ id: crypto.randomUUID(), name: "Initial Admin Token", tokenHash: hash }).run();
      }
    });

    const [{ count: afterCount }] = db.select({ count: count() }).from(authTokens).all();
    expect(afterCount).toBe(1);
    expect(token).toHaveLength(64);
  });

  test("skips token creation when tokens already exist (transactional)", async () => {
    const db = setupDb();

    // Pre-insert a token
    const { generateToken } = await import("../../../src/core/auth/token.js");
    const { hash } = await generateToken();
    db.insert(authTokens).values({ id: crypto.randomUUID(), name: "Existing", tokenHash: hash }).run();

    const [{ count: beforeCount }] = db.select({ count: count() }).from(authTokens).all();
    expect(beforeCount).toBe(1);

    // Simulate first-run check — transaction should NOT insert because count > 0
    const { hash: h2 } = await generateToken();
    db.transaction((tx) => {
      const row = tx.select({ count: count() }).from(authTokens).get();
      if (row && row.count === 0) {
        tx.insert(authTokens).values({ id: crypto.randomUUID(), name: "Initial Admin Token", tokenHash: h2 }).run();
      }
    });

    const [{ count: afterCount }] = db.select({ count: count() }).from(authTokens).all();
    expect(afterCount).toBe(1);
  });
});
