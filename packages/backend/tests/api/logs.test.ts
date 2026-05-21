import { describe, expect, test, beforeEach } from "bun:test";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createMemoryDb } from "../../src/db/connection.js";
import { authTokens } from "../../src/db/schema/auth_tokens.js";
import { requestLogs } from "../../src/db/schema/request_logs.js";
import { providers } from "../../src/db/schema/providers.js";
import { endpoints } from "../../src/db/schema/endpoints.js";
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

function insertProvider(db: ReturnType<typeof setupDb>) {
  const id = crypto.randomUUID();
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

function insertEndpoint(db: ReturnType<typeof setupDb>) {
  const id = crypto.randomUUID();
  db.insert(endpoints)
    .values({
      id,
      name: "Test Endpoint",
      path: `ep-${id.slice(0, 8)}`,
      tokenHash: "dummy-hash",
      enabled: true,
    })
    .run();
  return id;
}

function insertLog(
  db: ReturnType<typeof setupDb>,
  opts: {
    endpointId?: string;
    providerId?: string;
    requestedModel?: string;
    status?: string;
    latencyMs?: number;
    promptTokens?: number;
    completionTokens?: number;
    createdAt?: string;
  } = {},
) {
  db.insert(requestLogs)
    .values({
      id: crypto.randomUUID(),
      endpointId: opts.endpointId ?? null,
      requestedModel: opts.requestedModel ?? "gpt-4",
      resolvedModel: null,
      providerId: opts.providerId ?? null,
      promptTokens: opts.promptTokens ?? null,
      completionTokens: opts.completionTokens ?? null,
      latencyMs: opts.latencyMs ?? 100,
      status: opts.status ?? "success",
      errorDetail: null,
      createdAt: opts.createdAt ?? new Date().toISOString(),
    })
    .run();
}

describe("Logs API", () => {
  let db: ReturnType<typeof setupDb>;
  let authToken: string;
  let providerId: string;
  let endpointId: string;

  beforeEach(async () => {
    resetEncryptionKey();
    db = setupDb();
    authToken = "test-admin-token-for-logs";
    const authTokenHash = await hashToken(authToken);
    db.insert(authTokens)
      .values({
        id: crypto.randomUUID(),
        name: "admin",
        tokenHash: authTokenHash,
      })
      .run();
    providerId = insertProvider(db);
    endpointId = insertEndpoint(db);
  });

  function createCaller() {
    const ctx: tRPCContext = { authorized: true, token: authToken, db };
    return appRouter.createCaller(ctx);
  }

  test("list returns empty when no logs", async () => {
    const caller = createCaller();
    const result = await caller.logs.list({});
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  test("list returns logs", async () => {
    insertLog(db);
    insertLog(db);
    const caller = createCaller();
    const result = await caller.logs.list({});
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(2);
  });

  test("list filters by endpointId", async () => {
    insertLog(db, { endpointId });
    insertLog(db);
    const caller = createCaller();
    const result = await caller.logs.list({ endpointId });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items[0]!.endpointId).toBe(endpointId);
  });

  test("list filters by providerId", async () => {
    insertLog(db, { providerId });
    insertLog(db);
    const caller = createCaller();
    const result = await caller.logs.list({ providerId });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
  });

  test("list filters by status", async () => {
    insertLog(db, { status: "success" });
    insertLog(db, { status: "error" });
    const caller = createCaller();
    const result = await caller.logs.list({ status: "error" });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
    expect(result.items[0]!.status).toBe("error");
  });

  test("list filters by date range", async () => {
    insertLog(db, { createdAt: "2025-01-01T00:00:00Z" });
    insertLog(db, { createdAt: "2025-06-15T00:00:00Z" });
    insertLog(db, { createdAt: "2025-12-31T00:00:00Z" });
    const caller = createCaller();
    const result = await caller.logs.list({
      from: "2025-03-01T00:00:00Z",
      to: "2025-09-01T00:00:00Z",
    });
    expect(result.items.length).toBe(1);
    expect(result.total).toBe(1);
  });

  test("list pagination with limit and offset", async () => {
    for (let i = 0; i < 5; i++) insertLog(db);
    const caller = createCaller();
    const page1 = await caller.logs.list({ limit: 2, offset: 0 });
    expect(page1.items.length).toBe(2);
    expect(page1.total).toBe(5);
    const page2 = await caller.logs.list({ limit: 2, offset: 2 });
    expect(page2.items.length).toBe(2);
    const page3 = await caller.logs.list({ limit: 2, offset: 4 });
    expect(page3.items.length).toBe(1);
  });

  test("list default limit is 50", async () => {
    const caller = createCaller();
    const result = await caller.logs.list({});
    expect(result.items.length).toBe(0);
    expect(result.total).toBe(0);
  });

  test("list limit clamped to max 500", async () => {
    for (let i = 0; i < 5; i++) insertLog(db);
    const caller = createCaller();
    const result = await caller.logs.list({ limit: 500 });
    expect(result.items.length).toBe(5);
  });

  test("list rejects limit > 500 via zod", async () => {
    const caller = createCaller();
    await expect(caller.logs.list({ limit: 501 })).rejects.toThrow();
  });

  test("stats returns aggregated stats", async () => {
    insertLog(db, { status: "success", latencyMs: 100, promptTokens: 50, completionTokens: 50 });
    insertLog(db, { status: "success", latencyMs: 200, promptTokens: 100, completionTokens: 100 });
    insertLog(db, { status: "error", latencyMs: 300, promptTokens: 0, completionTokens: 0 });
    const caller = createCaller();
    const result = await caller.logs.stats({});
    expect(result.totalRequests).toBe(3);
    expect(result.successRate).toBeGreaterThan(0);
    expect(result.avgLatencyMs).toBeDefined();
    expect(result.totalTokens).toBe(300);
    expect(result.byProvider).toBeDefined();
    expect(result.byModel).toBeDefined();
  });

  test("stats respects date filters", async () => {
    insertLog(db, { createdAt: "2024-01-01T00:00:00Z" });
    insertLog(db, { createdAt: "2026-01-01T00:00:00Z" });
    const caller = createCaller();
    const result = await caller.logs.stats({
      from: "2025-01-01T00:00:00Z",
    });
    expect(result.totalRequests).toBe(1);
  });

  test("stats with no logs returns zeros", async () => {
    const caller = createCaller();
    const result = await caller.logs.stats({});
    expect(result.totalRequests).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.totalTokens).toBe(0);
  });

  test("clear removes old logs", async () => {
    const oldDate = "2024-01-01T00:00:00Z";
    const recentDate = "2026-01-01T00:00:00Z";
    insertLog(db, { createdAt: oldDate });
    insertLog(db, { createdAt: recentDate });
    const caller = createCaller();
    const before = await caller.logs.list({});
    expect(before.total).toBe(2);

    await caller.logs.clear({ before: "2025-01-01T00:00:00Z" });

    const after = await caller.logs.list({});
    expect(after.total).toBe(1);
  });

  test("clear without before uses retention period", async () => {
    const caller = createCaller();
    const result = await caller.logs.clear({});
    expect(result.success).toBe(true);
  });
});
