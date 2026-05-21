import { describe, expect, test } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { validateEndpointToken } from "../../../src/core/auth/endpoint.js";
import { hashToken } from "../../../src/core/auth/token.js";
import { createMemoryDb } from "../../../src/db/connection.js";
import { endpoints } from "../../../src/db/schema/endpoints.js";

function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

describe("validateEndpointToken", () => {
  test("returns endpoint for valid path + token", async () => {
    const db = setupDb();
    const token = "test-endpoint-token";
    const hash = await hashToken(token);

    db.insert(endpoints).values({
      id: "ep-1",
      name: "Test Endpoint",
      path: "/v1/chat",
      tokenHash: hash,
      enabled: true,
    }).run();

    const result = await validateEndpointToken(db, "/v1/chat", token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ep-1");
    expect(result!.path).toBe("/v1/chat");
  });

  test("returns null for wrong token", async () => {
    const db = setupDb();
    const token = "correct-token";
    const hash = await hashToken(token);

    db.insert(endpoints).values({
      id: "ep-1",
      name: "Test Endpoint",
      path: "/v1/chat",
      tokenHash: hash,
      enabled: true,
    }).run();

    const result = await validateEndpointToken(db, "/v1/chat", "wrong-token");
    expect(result).toBeNull();
  });

  test("returns null for wrong path", async () => {
    const db = setupDb();
    const token = "test-token";
    const hash = await hashToken(token);

    db.insert(endpoints).values({
      id: "ep-1",
      name: "Test Endpoint",
      path: "/v1/chat",
      tokenHash: hash,
      enabled: true,
    }).run();

    const result = await validateEndpointToken(db, "/v1/wrong", token);
    expect(result).toBeNull();
  });

  test("returns null for disabled endpoint", async () => {
    const db = setupDb();
    const token = "disabled-token";
    const hash = await hashToken(token);

    db.insert(endpoints).values({
      id: "ep-1",
      name: "Disabled Endpoint",
      path: "/v1/disabled",
      tokenHash: hash,
      enabled: false,
    }).run();

    const result = await validateEndpointToken(db, "/v1/disabled", token);
    expect(result).toBeNull();
  });
});
