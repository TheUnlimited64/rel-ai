import { describe, expect, test, beforeEach } from "bun:test";
import { createMemoryDb } from "../../../src/db/connection.js";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { RequestLogger, mapStatus } from "../../../src/core/logging/logger.js";
import { RequestLogQuery } from "../../../src/core/logging/query.js";
import { requestLogs } from "../../../src/db/schema/request_logs.js";
import { providers, endpoints } from "../../../src/db/schema/index.js";

// Helper: create in-memory DB with migrations applied
function setupDb() {
  const db = createMemoryDb();
  const migrationsFolder = `${import.meta.dirname}/../../../src/db/migrations`;
  migrate(db, { migrationsFolder });
  return db;
}

// Helper: seed parent records so FK constraints pass
function seedParents(db: ReturnType<typeof createMemoryDb>) {
  db.insert(providers).values({
    id: "p-openai",
    name: "OpenAI",
    adapterType: "openai",
    baseUrl: "https://api.openai.com",
    apiKey: "sk-test",
    enabled: true,
  }).run();

  db.insert(providers).values({
    id: "p-anthropic",
    name: "Anthropic",
    adapterType: "anthropic",
    baseUrl: "https://api.anthropic.com",
    apiKey: "sk-ant-test",
    enabled: true,
  }).run();

  db.insert(endpoints).values({
    id: "ep-1",
    name: "chat",
    path: "/chat",
    tokenHash: "hash123",
    enabled: true,
  }).run();

  db.insert(endpoints).values({
    id: "ep-2",
    name: "other",
    path: "/other",
    tokenHash: "hash456",
    enabled: true,
  }).run();
}

// Helper: insert a log row directly for query tests
function insertLog(
  db: ReturnType<typeof createMemoryDb>,
  overrides: Partial<typeof requestLogs.$inferInsert> = {},
) {
  db.insert(requestLogs).values({
    id: crypto.randomUUID(),
    requestedModel: "gpt-4",
    resolvedModel: "gpt-4",
    providerId: "p-openai",
    latencyMs: 100,
    status: "success",
    promptTokens: 10,
    completionTokens: 20,
    ...overrides,
  }).run();
}

describe("mapStatus", () => {
  test("status < 400 → 'success'", () => {
    expect(mapStatus(200)).toBe("success");
    expect(mapStatus(301)).toBe("success");
  });

  test("status 429 → 'rate_limited'", () => {
    expect(mapStatus(429)).toBe("rate_limited");
  });

  test("status >= 400 (not 429) → 'error'", () => {
    expect(mapStatus(400)).toBe("error");
    expect(mapStatus(500)).toBe("error");
    expect(mapStatus(502)).toBe("error");
  });
});

describe("RequestLogger", () => {
  let db: ReturnType<typeof createMemoryDb>;
  let logger: RequestLogger;

  beforeEach(() => {
    db = setupDb();
    seedParents(db);
    logger = new RequestLogger(db);
  });

  test("log entry persists and is queryable", () => {
    logger.log({
      endpointId: "ep-1",
      requestedModel: "gpt-4",
      resolvedModel: "gpt-4-turbo",
      providerId: "p-openai",
      promptTokens: 100,
      completionTokens: 200,
      latencyMs: 350,
      status: 200,
    });

    const rows = db.select().from(requestLogs).all();
    expect(rows.length).toBe(1);
    const row = rows[0]!;
    expect(row.endpointId).toBe("ep-1");
    expect(row.requestedModel).toBe("gpt-4");
    expect(row.resolvedModel).toBe("gpt-4-turbo");
    expect(row.providerId).toBe("p-openai");
    expect(row.promptTokens).toBe(100);
    expect(row.completionTokens).toBe(200);
    expect(row.latencyMs).toBe(350);
    expect(row.status).toBe("success");
    expect(row.errorDetail).toBeNull();
  });

  test("log maps 429 to 'rate_limited'", () => {
    logger.log({
      requestedModel: "gpt-4",
      providerId: "p-openai",
      latencyMs: 50,
      status: 429,
      errorDetail: "Rate limit exceeded",
    });

    const rows = db.select().from(requestLogs).all();
    expect(rows.length).toBe(1);
    expect(rows[0]!.status).toBe("rate_limited");
    expect(rows[0]!.errorDetail).toBe("Rate limit exceeded");
  });

  test("log maps 500 to 'error'", () => {
    logger.log({
      requestedModel: "gpt-4",
      latencyMs: 10,
      status: 500,
      errorDetail: "Internal error",
    });

    const rows = db.select().from(requestLogs).all();
    expect(rows[0]!.status).toBe("error");
  });

  test("logFromProxy bridges RequestLogData", () => {
    logger.logFromProxy({
      model: "gpt-4",
      providerId: "p-openai",
      providerModel: "gpt-4-turbo",
      adapterType: "openai",
      stream: false,
      status: 200,
      durationMs: 120,
      tokens: { promptTokens: 50, completionTokens: 100 },
      endpointId: "ep-1",
    });

    const rows = db.select().from(requestLogs).all();
    expect(rows.length).toBe(1);
    expect(rows[0]!.requestedModel).toBe("gpt-4");
    expect(rows[0]!.resolvedModel).toBe("gpt-4-turbo");
    expect(rows[0]!.promptTokens).toBe(50);
    expect(rows[0]!.completionTokens).toBe(100);
    expect(rows[0]!.latencyMs).toBe(120);
    expect(rows[0]!.status).toBe("success");
    expect(rows[0]!.endpointId).toBe("ep-1");
  });

  test("purgeOldLogs removes entries older than retention", () => {
    // Use a logger with 30-day retention
    const purgeLogger = new RequestLogger(db, 30);

    // Insert a log with a past createdAt
    db.insert(requestLogs).values({
      id: crypto.randomUUID(),
      requestedModel: "old-model",
      latencyMs: 10,
      status: "success",
      createdAt: "2020-01-01 00:00:00",
    }).run();

    // Insert a recent log with explicit recent createdAt
    db.insert(requestLogs).values({
      id: crypto.randomUUID(),
      requestedModel: "new-model",
      latencyMs: 10,
      status: "success",
      createdAt: "2099-06-01 00:00:00",
    }).run();

    expect(db.select().from(requestLogs).all().length).toBe(2);

    purgeLogger.purgeOldLogs();

    const remaining = db.select().from(requestLogs).all();
    expect(remaining.length).toBe(1);
    expect(remaining[0]!.requestedModel).toBe("new-model");
  });

  test("purgeOldLogs uses parameterized query — no sql.raw injection", () => {
    // Even with NaN or unusual numbers, purge must not throw or corrupt data
    const purgeLogger = new RequestLogger(db, 0);

    db.insert(requestLogs).values({
      id: crypto.randomUUID(),
      requestedModel: "recent-model",
      latencyMs: 10,
      status: "success",
      createdAt: new Date().toISOString(),
    }).run();

    // 0-day retention: should delete everything older than today
    expect(() => purgeLogger.purgeOldLogs()).not.toThrow();

    // Verify no sql.raw remains in the module source
    const fs = require("fs") as typeof import("fs");
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.resolve(import.meta.dirname, "../../../src/core/logging/logger.ts"),
      "utf-8",
    );
    expect(src).not.toContain("sql.raw");
  });
});

describe("RequestLogQuery", () => {
  let db: ReturnType<typeof createMemoryDb>;
  let query: RequestLogQuery;

  beforeEach(() => {
    db = setupDb();
    seedParents(db);
    query = new RequestLogQuery(db);
  });

  test("list returns paginated results", () => {
    for (let i = 0; i < 5; i++) {
      insertLog(db, { requestedModel: `model-${i}` });
    }

    const result = query.list({ limit: 3, offset: 0 });
    expect(result.total).toBe(5);
    expect(result.items.length).toBe(3);
  });

  test("list filters by endpointId", () => {
    insertLog(db, { endpointId: "ep-1" });
    insertLog(db, { endpointId: "ep-2" });
    insertLog(db, { endpointId: "ep-1" });

    const result = query.list({ endpointId: "ep-1" });
    expect(result.total).toBe(2);
    expect(result.items.every((r) => r.endpointId === "ep-1")).toBe(true);
  });

  test("list filters by providerId", () => {
    insertLog(db, { providerId: "p-openai" });
    insertLog(db, { providerId: "p-anthropic" });

    const result = query.list({ providerId: "p-openai" });
    expect(result.total).toBe(1);
  });

  test("list filters by status", () => {
    insertLog(db, { status: "success", providerId: null });
    insertLog(db, { status: "error", providerId: null });
    insertLog(db, { status: "rate_limited", providerId: null });

    const result = query.list({ status: "error" });
    expect(result.total).toBe(1);
  });

  test("list filters by date range", () => {
    insertLog(db, { createdAt: "2024-01-15 00:00:00", providerId: null });
    insertLog(db, { createdAt: "2024-06-15 00:00:00", providerId: null });
    insertLog(db, { createdAt: "2024-12-15 00:00:00", providerId: null });

    const result = query.list({ from: "2024-06-01 00:00:00", to: "2024-07-01 00:00:00" });
    expect(result.total).toBe(1);
  });

  test("stats returns aggregated data", () => {
    insertLog(db, { providerId: "p-openai", requestedModel: "gpt-4", latencyMs: 100, status: "success", promptTokens: 10, completionTokens: 20 });
    insertLog(db, { providerId: "p-openai", requestedModel: "gpt-4", latencyMs: 200, status: "success", promptTokens: 5, completionTokens: 10 });
    insertLog(db, { providerId: "p-anthropic", requestedModel: "claude-3", latencyMs: 150, status: "error", errorDetail: "timeout", promptTokens: null, completionTokens: null });

    const stats = query.stats();

    expect(stats.totalRequests).toBe(3);
    expect(stats.successRate).toBeCloseTo(0.667, 2);
    expect(stats.avgLatencyMs).toBe(150); // (100+200+150)/3
    expect(stats.totalTokens).toBe(45); // 10+20+5+10

    expect(stats.byProvider.length).toBe(2);
    const openaiStat = stats.byProvider.find((p) => p.id === "p-openai")!;
    expect(openaiStat.count).toBe(2);
    expect(openaiStat.successRate).toBe(1);
    expect(openaiStat.avgLatencyMs).toBe(150); // (100+200)/2

    const anthropicStat = stats.byProvider.find((p) => p.id === "p-anthropic")!;
    expect(anthropicStat.count).toBe(1);
    expect(anthropicStat.successRate).toBe(0);

    expect(stats.byModel.length).toBe(2);
    const gpt4Stat = stats.byModel.find((m) => m.id === "gpt-4")!;
    expect(gpt4Stat.count).toBe(2);
    expect(gpt4Stat.successRate).toBe(1);
  });

  test("stats with empty table", () => {
    const stats = query.stats();
    expect(stats.totalRequests).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.avgLatencyMs).toBeNull();
    expect(stats.totalTokens).toBe(0);
    expect(stats.byProvider.length).toBe(0);
    expect(stats.byModel.length).toBe(0);
  });
});
