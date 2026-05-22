import { eq, lt, sql } from "drizzle-orm";
import { requestLogs } from "../../db/schema/request_logs.js";
import type { DbClient } from "../../db/connection.js";
import type { RequestLogData } from "../proxy/types.js";

export type RequestLogEntry = {
  endpointId?: string;
  requestedModel: string;
  resolvedModel?: string;
  providerId?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  status: number;
  errorDetail?: string;
};

export type LogStatus = "success" | "error" | "rate_limited";

export function mapStatus(httpStatus: number): LogStatus {
  if (httpStatus < 400) return "success";
  if (httpStatus === 429) return "rate_limited";
  return "error";
}

export class RequestLogger {
  private db: DbClient;
  private retentionDays: number;

  constructor(db: DbClient, retentionDays = 30) {
    this.db = db;
    this.retentionDays = retentionDays;
  }

  log(entry: RequestLogEntry): void {
    this.db.insert(requestLogs).values({
      id: crypto.randomUUID(),
      endpointId: entry.endpointId ?? null,
      requestedModel: entry.requestedModel,
      resolvedModel: entry.resolvedModel ?? null,
      providerId: entry.providerId ?? null,
      promptTokens: entry.promptTokens ?? null,
      completionTokens: entry.completionTokens ?? null,
      latencyMs: entry.latencyMs,
      status: mapStatus(entry.status),
      errorDetail: entry.errorDetail ?? null,
      createdAt: new Date().toISOString(),
    }).run();
  }

  /** Accept RequestLogData from proxy handler and persist. */
  logFromProxy(data: RequestLogData): void {
    this.log({
      endpointId: data.endpointId,
      requestedModel: data.model,
      resolvedModel: data.providerModel || undefined,
      providerId: data.providerId || undefined,
      promptTokens: data.tokens?.promptTokens,
      completionTokens: data.tokens?.completionTokens,
      latencyMs: data.durationMs,
      status: data.status,
      errorDetail: data.error,
    });
  }

  /** Remove logs older than retention period. */
  purgeOldLogs(): void {
    const cutoffExpr = sql`(datetime('now', '-${sql.raw(String(this.retentionDays))} days'))`;
    this.db
      .delete(requestLogs)
      .where(lt(requestLogs.createdAt, cutoffExpr))
      .run();
  }
}
