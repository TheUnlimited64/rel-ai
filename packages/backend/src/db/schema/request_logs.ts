import {
  sqliteTable,
  text,
  integer,
  index,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { endpoints } from "./endpoints.js";
import { providers } from "./providers.js";

export const requestLogs = sqliteTable(
  "request_logs",
  {
    id: text("id").primaryKey(),
    endpointId: text("endpoint_id").references(() => endpoints.id),
    requestedModel: text("requested_model").notNull(),
    resolvedModel: text("resolved_model"),
    providerId: text("provider_id").references(() => providers.id),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull(),
    errorDetail: text("error_detail"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    index("idx_request_logs_endpoint").on(table.endpointId),
    index("idx_request_logs_created").on(table.createdAt),
    index("idx_request_logs_provider").on(table.providerId),
    check(
      "request_logs_status_check",
      sql`${table.status} IN ('success', 'error', 'rate_limited')`,
    ),
  ],
);
