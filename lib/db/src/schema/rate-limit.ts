import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const poeChatRateLimitsTable = pgTable("poe_chat_rate_limits", {
  clientIp: text("client_ip").primaryKey(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull(),
}, (table) => ({
  windowStartedAtIdx: index("poe_chat_rate_limits_window_started_at_idx").on(
    table.windowStartedAt,
  ),
}));