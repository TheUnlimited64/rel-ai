import { describe, expect, test, beforeEach } from "bun:test";
import { createMemoryDb } from "../../../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { providers } from "../../../src/db/schema/providers.js";
import { requestLogs } from "../../../src/db/schema/request_logs.js";
import { encrypt, resetEncryptionKey } from "../../../src/core/auth/encryption.js";
import { RequestLogQuery } from "../../../src/core/logging/query.js";
import { endpoints } from "../../../src/db/schema/endpoints.js";
import type { DbClient } from "../../../src/db/connection.js";

function setupDb(): DbClient {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

async function seedProvider(db: DbClient, id = "prov-1"): Promise<void> {
  resetEncryptionKey();
  const encrypted = await encrypt("sk-test");
  db.insert(providers)
    .values({
      id,
      name: `Provider ${id}`,
      adapterType: "openai",
      baseUrl: "https://api.openai.com",
      apiKey: encrypted,
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
    })
    .run();
}

async function seedEndpoint(db: DbClient, id = "ep-1"): Promise<void> {
  resetEncryptionKey();
  const { hash } = await (await import("../../../src/core/auth/token.js")).generateToken();
  db.insert(endpoints)
    .values({
      id,
      name: `Endpoint ${id}`,
      path: id,
      tokenHash: hash,
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
    })
    .run();
}

function insertLog(
  db: DbClient,
  opts: {
    id: string;
    endpointId?: string;
    requestedModel: string;
    resolvedModel?: string;
    providerId?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs?: number;
    status: string;
    errorDetail?: string;
    createdAt?: string;
  },
) {
  db.insert(requestLogs)
    .values({
      id: opts.id,
      endpointId: opts.endpointId ?? null,
      requestedModel: opts.requestedModel,
      resolvedModel: opts.resolvedModel ?? null,
      providerId: opts.providerId ?? null,
      promptTokens: opts.promptTokens ?? null,
      completionTokens: opts.completionTokens ?? null,
      latencyMs: opts.latencyMs ?? null,
      status: opts.status,
      errorDetail: opts.errorDetail ?? null,
      createdAt: opts.createdAt ?? "2026-01-15 12:00:00",
    })
    .run();
}

describe("RequestLogQuery.list", () => {
  let db: DbClient;
  let query: RequestLogQuery;

  beforeEach(async () => {
    db = setupDb();
    await seedProvider(db, "prov-1");
    await seedProvider(db, "prov-2");
    query = new RequestLogQuery(db);
  });

  test("list all logs returns paginated results", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-3.5", providerId: "prov-2", status: "error" });

    const result = query.list();
    expect(result.items.length).toBe(2);
    expect(result.total).toBe(2);
  });

  test("filter by providerId", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-3.5", providerId: "prov-2", status: "success" });

    const result = query.list({ providerId: "prov-1" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.providerId).toBe("prov-1");
  });

  test("filter by endpointId", async () => {
    await seedEndpoint(db, "ep-1");
    await seedEndpoint(db, "ep-2");
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", endpointId: "ep-1", status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", endpointId: "ep-2", status: "success" });

    const result = query.list({ endpointId: "ep-1" });
    expect(result.items.length).toBe(1);
  });

  test("filter by status", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", status: "error" });

    const result = query.list({ status: "error" });
    expect(result.items.length).toBe(1);
    expect(result.items[0]!.status).toBe("error");
  });

  test("filter by date range", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", status: "success", createdAt: "2026-01-10 00:00:00" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", status: "success", createdAt: "2026-01-20 00:00:00" });

    const result = query.list({ from: "2026-01-15 00:00:00", to: "2026-01-25 00:00:00" });
    expect(result.items.length).toBe(1);
  });

  test("pagination with limit and offset", () => {
    for (let i = 0; i < 5; i++) {
      insertLog(db, { id: `log-${i}`, requestedModel: "gpt-4", status: "success", createdAt: `2026-01-${10 + i} 00:00:00` });
    }

    const page1 = query.list({ limit: 2, offset: 0 });
    expect(page1.items.length).toBe(2);
    expect(page1.total).toBe(5);

    const page2 = query.list({ limit: 2, offset: 2 });
    expect(page2.items.length).toBe(2);
  });

  test("combined filters", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", status: "success", createdAt: "2026-01-10 00:00:00" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", providerId: "prov-1", status: "error", createdAt: "2026-01-10 00:00:00" });
    insertLog(db, { id: "log-3", requestedModel: "gpt-4", providerId: "prov-2", status: "success", createdAt: "2026-01-10 00:00:00" });

    const result = query.list({ providerId: "prov-1", status: "success" });
    expect(result.items.length).toBe(1);
  });

  test("empty result returns empty array with total 0", () => {
    const result = query.list({ providerId: "nonexistent" });
    expect(result.items.length).toBe(0);
    expect(result.total).toBe(0);
  });
});

describe("RequestLogQuery.stats", () => {
  let db: DbClient;
  let query: RequestLogQuery;

  beforeEach(async () => {
    db = setupDb();
    await seedProvider(db, "prov-1");
    await seedProvider(db, "prov-2");
    query = new RequestLogQuery(db);
  });

  test("stats with multiple requests returns correct totals", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", promptTokens: 100, completionTokens: 50, latencyMs: 200, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", providerId: "prov-1", promptTokens: 200, completionTokens: 100, latencyMs: 400, status: "error" });

    const result = query.stats();
    expect(result.totalRequests).toBe(2);
  });

  test("successRate calculation correct", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", promptTokens: 100, completionTokens: 50, latencyMs: 200, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", promptTokens: 100, completionTokens: 50, latencyMs: 200, status: "success" });
    insertLog(db, { id: "log-3", requestedModel: "gpt-4", promptTokens: 100, completionTokens: 50, latencyMs: 200, status: "error" });

    const result = query.stats();
    expect(result.successRate).toBe(0.667);
  });

  test("avgLatencyMs calculates correctly", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", latencyMs: 100, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", latencyMs: 300, status: "success" });

    const result = query.stats();
    expect(result.avgLatencyMs).toBe(200);
  });

  test("totalTokens sums prompt + completion", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", promptTokens: 100, completionTokens: 50, latencyMs: 100, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", promptTokens: 200, completionTokens: 100, latencyMs: 100, status: "success" });

    const result = query.stats();
    expect(result.totalTokens).toBe(450);
  });

  test("byProvider breakdown", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", latencyMs: 100, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-4", providerId: "prov-2", latencyMs: 200, status: "error" });

    const result = query.stats();
    expect(result.byProvider.length).toBe(2);
    const prov1 = result.byProvider.find((p) => p.id === "prov-1");
    expect(prov1?.count).toBe(1);
    expect(prov1?.successRate).toBe(1);
  });

  test("byModel breakdown", () => {
    insertLog(db, { id: "log-1", requestedModel: "gpt-4", providerId: "prov-1", latencyMs: 100, status: "success" });
    insertLog(db, { id: "log-2", requestedModel: "gpt-3.5", providerId: "prov-1", latencyMs: 200, status: "success" });

    const result = query.stats();
    expect(result.byModel.length).toBe(2);
    const gpt4 = result.byModel.find((m) => m.id === "gpt-4");
    expect(gpt4?.count).toBe(1);
  });

  test("no requests returns zero stats without division by zero", () => {
    const result = query.stats();
    expect(result.totalRequests).toBe(0);
    expect(result.successRate).toBe(0);
    expect(result.avgLatencyMs).toBeNull();
    expect(result.totalTokens).toBe(0);
    expect(result.byProvider).toEqual([]);
    expect(result.byModel).toEqual([]);
  });
});


