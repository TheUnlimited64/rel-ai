import { and, count, avg, sql, desc, eq, gte, lte } from "drizzle-orm";
import { requestLogs } from "../../db/schema/request_logs.js";
import type { DbClient } from "../../db/connection.js";

export type ListFilters = {
  endpointId?: string;
  providerId?: string;
  status?: "success" | "error" | "rate_limited";
  from?: string; // ISO date string
  to?: string;
  limit?: number;
  offset?: number;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
};

export type LogRow = typeof requestLogs.$inferSelect;

export type StatsResult = {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number | null;
  totalTokens: number;
  byProvider: Array<{ id: string; count: number; successRate: number; avgLatencyMs: number | null }>;
  byModel: Array<{ id: string; count: number; successRate: number; avgLatencyMs: number | null }>;
};

export class RequestLogQuery {
  private db: DbClient;

  constructor(db: DbClient) {
    this.db = db;
  }

  list(filters: ListFilters = {}): PaginatedResult<LogRow> {
    const conditions = buildConditions(filters);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const totalResult = this.db
      .select({ count: count() })
      .from(requestLogs)
      .where(where)
      .get();

    const total = totalResult?.count ?? 0;

    const items = this.db
      .select()
      .from(requestLogs)
      .where(where)
      .orderBy(desc(requestLogs.createdAt))
      .limit(filters.limit ?? 50)
      .offset(filters.offset ?? 0)
      .all();

    return { items, total };
  }

  stats(filters: ListFilters = {}): StatsResult {
    const conditions = buildConditions(filters);
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    // Overall stats
    const overall = this.db
      .select({
        total: count(),
        successCount: sql<number>`sum(case when ${requestLogs.status} = 'success' then 1 else 0 end)`,
        avgLatency: avg(requestLogs.latencyMs),
        totalPromptTokens: sql<number>`coalesce(sum(${requestLogs.promptTokens}), 0)`,
        totalCompletionTokens: sql<number>`coalesce(sum(${requestLogs.completionTokens}), 0)`,
      })
      .from(requestLogs)
      .where(where)
      .get();

    if (!overall) {
      return {
        totalRequests: 0,
        successRate: 0,
        avgLatencyMs: null,
        totalTokens: 0,
        byProvider: [],
        byModel: [],
      };
    }

    // By provider
    const byProviderRows = this.db
      .select({
        id: requestLogs.providerId,
        count: count(),
        successCount: sql<number>`sum(case when ${requestLogs.status} = 'success' then 1 else 0 end)`,
        avgLatency: avg(requestLogs.latencyMs),
      })
      .from(requestLogs)
      .where(where)
      .groupBy(requestLogs.providerId)
      .all();

    // By model
    const byModelRows = this.db
      .select({
        id: requestLogs.requestedModel,
        count: count(),
        successCount: sql<number>`sum(case when ${requestLogs.status} = 'success' then 1 else 0 end)`,
        avgLatency: avg(requestLogs.latencyMs),
      })
      .from(requestLogs)
      .where(where)
      .groupBy(requestLogs.requestedModel)
      .all();

    const totalRequests = overall.total;
    const successRate = totalRequests > 0
      ? Number(overall.successCount) / totalRequests
      : 0;

    return {
      totalRequests,
      successRate: Math.round(successRate * 1000) / 1000,
      avgLatencyMs: overall.avgLatency ? Math.round(Number(overall.avgLatency)) : null,
      totalTokens: Number(overall.totalPromptTokens) + Number(overall.totalCompletionTokens),
      byProvider: byProviderRows.map((r) => ({
        id: r.id ?? "",
        count: r.count,
        successRate: r.count > 0 ? Math.round((Number(r.successCount) / r.count) * 1000) / 1000 : 0,
        avgLatencyMs: r.avgLatency ? Math.round(Number(r.avgLatency)) : null,
      })),
      byModel: byModelRows.map((r) => ({
        id: r.id,
        count: r.count,
        successRate: r.count > 0 ? Math.round((Number(r.successCount) / r.count) * 1000) / 1000 : 0,
        avgLatencyMs: r.avgLatency ? Math.round(Number(r.avgLatency)) : null,
      })),
    };
  }
}

function buildConditions(filters: { endpointId?: string; providerId?: string; status?: string; from?: string; to?: string }) {
  const conditions: ReturnType<typeof eq>[] = [];

  if (filters.endpointId) {
    conditions.push(eq(requestLogs.endpointId, filters.endpointId));
  }
  if (filters.providerId) {
    conditions.push(eq(requestLogs.providerId, filters.providerId));
  }
  if (filters.status) {
    conditions.push(eq(requestLogs.status, filters.status));
  }
  if (filters.from) {
    conditions.push(gte(requestLogs.createdAt, filters.from));
  }
  if (filters.to) {
    conditions.push(lte(requestLogs.createdAt, filters.to));
  }

  return conditions;
}
