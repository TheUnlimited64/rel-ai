import {
  sqliteTable,
  text,
  check,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { providers } from "./providers.js";

export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey(),
    displayName: text("display_name").notNull(),
    type: text("type").notNull(),
    variant: text("variant"),
    providerId: text("provider_id").references(() => providers.id),
    providerModel: text("provider_model"),
    baseModelId: text("base_model_id"), // Self-ref FK enforced at app level (Drizzle circular type issue)
    fallbackChain: text("fallback_chain"), // JSON array of model IDs
    overrides: text("overrides"), // JSON
    createdAt: text("created_at")
      .notNull()
      .default("(datetime('now'))"),
    updatedAt: text("updated_at")
      .notNull()
      .default("(datetime('now'))"),
  },
  (table) => ({
    typeCheck: check(
      "models_type_check",
      sql`${table.type} IN ('real', 'virtual')`,
    ),
    variantCheck: check(
      "models_variant_check",
      sql`${table.variant} IN ('fallback', 'tuned')`,
    ),
  }),
);
