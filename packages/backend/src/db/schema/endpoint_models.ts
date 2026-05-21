import {
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";
import { endpoints } from "./endpoints.js";
import { models } from "./models.js";

export const endpointModels = sqliteTable(
  "endpoint_models",
  {
    endpointId: text("endpoint_id")
      .notNull()
      .references(() => endpoints.id, { onDelete: "cascade" }),
    modelId: text("model_id")
      .notNull()
      .references(() => models.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey(table.endpointId, table.modelId),
  }),
);
