import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  adapterType: text("adapter_type").notNull(),
  baseUrl: text("base_url").notNull(),
  /** Stored as encrypted ciphertext — use decrypt() to get plaintext, never use raw */
  apiKey: text("api_key").notNull(),
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(true),
  config: text("config"), // JSON string
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
