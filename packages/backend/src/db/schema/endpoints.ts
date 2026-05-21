import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const endpoints = sqliteTable("endpoints", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull().unique(),
  tokenHash: text("token_hash").notNull(),
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  createdAt: text("created_at")
    .notNull()
    .default("(datetime('now'))"),
  updatedAt: text("updated_at")
    .notNull()
    .default("(datetime('now'))"),
});
