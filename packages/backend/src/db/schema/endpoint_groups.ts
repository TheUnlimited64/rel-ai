import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";
import { endpoints } from "./endpoints.js";
import { modelGroups } from "./model_groups.js";

export const endpointGroups = sqliteTable(
  "endpoint_groups",
  {
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => endpoints.id, { onDelete: "cascade" }),
    groupId: text("group_id")
      .notNull()
      .references(() => modelGroups.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.endpointId, table.groupId] }),
  ],
);
