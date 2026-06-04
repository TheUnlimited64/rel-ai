import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const modelGroups = sqliteTable("model_groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  interfaceId: text("interface_id"), // nullable FK to self — enforced at app level (Drizzle circular type issue)
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
