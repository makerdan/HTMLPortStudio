import { jsonb, timestamp, varchar } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";

/** One administrator-owned override for the ordered, server-approved Poe fallbacks. */
export const poeRoutingConfigTable = pgTable("poe_routing_config", {
  id: varchar("id").primaryKey(),
  fallbackModelIds: jsonb("fallback_model_ids").$type<string[]>().notNull(),
  updatedBy: varchar("updated_by").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PoeRoutingConfig = typeof poeRoutingConfigTable.$inferSelect;