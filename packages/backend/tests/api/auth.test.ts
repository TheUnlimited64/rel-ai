import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createMemoryDb } from "../../src/db/connection.js";
import { authTokens } from "../../src/db/schema/auth_tokens.js";
import { hashToken, validateToken } from "../../src/core/auth/token.js";
import { appRouter } from "../../src/api/router.js";
import type { tRPCContext } from "../../src/api/context.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("Auth token CRUD", () => {
  let db: ReturnType<typeof setupDb>;
  let authToken: string;

  beforeEach(async () => {
    db = setupDb();
    // Create an admin token for authenticating CRUD requests
    authToken = "test-admin-token-for-crud";
    const authTokenHash = await hashToken(authToken);
    db.insert(authTokens).values({
      id: crypto.randomUUID(),
      name: "admin",
      tokenHash: authTokenHash,
    }).run();
  });

  function createCaller() {
    const ctx: tRPCContext = { authorized: true, token: authToken, db };
    return appRouter.createCaller(ctx);
  }

  test("createToken returns token, only hash stored in DB", async () => {
    const caller = createCaller();
    const result = await caller.auth.createToken({ name: "my-token" });

    // Token is returned
    expect(result.token).toBeDefined();
    expect(result.token.length).toBe(64);
    expect(result.name).toBe("my-token");

    // Only hash stored in DB - plaintext token should NOT match any tokenHash
    const allTokens = db.select().from(authTokens).all();
    const directMatch = allTokens.find((t) => t.tokenHash === result.token);
    expect(directMatch).toBeUndefined();

    // Hash should be findable by name
    const hashEntry = allTokens.find((t) => t.name === "my-token");
    expect(hashEntry).toBeDefined();
  });

  test("listTokens returns all tokens", async () => {
    const caller = createCaller();
    await caller.auth.createToken({ name: "token-1" });
    await caller.auth.createToken({ name: "token-2" });

    const result = await caller.auth.listTokens();
    // 3 tokens: 1 admin + 2 created
    expect(result.length).toBe(3);
  });

  test("deleteToken removes token", async () => {
    const caller = createCaller();
    const created = await caller.auth.createToken({ name: "to-delete" });

    const before = db.select().from(authTokens).all();
    expect(before.length).toBe(2);

    await caller.auth.deleteToken({ id: created.id });

    const after = db.select().from(authTokens).all();
    expect(after.length).toBe(1);
    expect(after[0]!.name).toBe("admin");
  });

  test("created token can be used for validation", async () => {
    const caller = createCaller();
    const created = await caller.auth.createToken({ name: "valid-token" });

    const validated = await validateToken(db, created.token);
    expect(validated).not.toBeNull();
    expect(validated!.name).toBe("valid-token");
  });
});
