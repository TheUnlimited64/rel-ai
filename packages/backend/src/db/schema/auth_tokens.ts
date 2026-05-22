import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const authTokens = sqliteTable(
  "auth_tokens",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    tokenHash: text("token_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
    lastUsedAt: text("last_used_at"),
  },
  (table) => ({
    tokenHashUnique: uniqueIndex("auth_tokens_token_hash_unique").on(
      table.tokenHash,
    ),
  }),
);
