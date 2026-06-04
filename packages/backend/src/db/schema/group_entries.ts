import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { modelGroups } from "./model_groups.js";
import { models } from "./models.js";

export const groupEntries = sqliteTable(
  "group_entries",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => modelGroups.id, { onDelete: "cascade" }),
    virtualName: text("virtual_name").notNull(),
    modelId: text("model_id").references(() => models.id, { onDelete: "set null" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.groupId, table.virtualName] }),
  }),
);
