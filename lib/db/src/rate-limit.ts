import { pool } from "./index";

export type PoeChatRateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

export async function takePoeChatRateLimit(
  clientIp: string,
  windowMs: number,
  maxRequests: number,
): Promise<PoeChatRateLimitDecision> {
  const result = await pool.query<{
    window_started_at: Date;
    request_count: number;
    database_now: Date;
  }>(
    `
      INSERT INTO "poe_chat_rate_limits"
        ("client_ip", "window_started_at", "request_count")
      VALUES ($1, CURRENT_TIMESTAMP, 1)
      ON CONFLICT ("client_ip") DO UPDATE
      SET
        "window_started_at" = CASE
          WHEN "poe_chat_rate_limits"."window_started_at" <=
            CURRENT_TIMESTAMP - ($2 * INTERVAL '1 millisecond')
          THEN CURRENT_TIMESTAMP
          ELSE "poe_chat_rate_limits"."window_started_at"
        END,
        "request_count" = CASE
          WHEN "poe_chat_rate_limits"."window_started_at" <=
            CURRENT_TIMESTAMP - ($2 * INTERVAL '1 millisecond')
          THEN 1
          WHEN "poe_chat_rate_limits"."request_count" < $3
          THEN "poe_chat_rate_limits"."request_count" + 1
          ELSE $3 + 1
        END
      RETURNING
        "window_started_at",
        "request_count",
        CURRENT_TIMESTAMP AS "database_now"
    `,
    [clientIp, windowMs, maxRequests],
  );

  const row = result.rows[0];
  if (!row) {
    throw new Error("POE_RATE_LIMIT_STORE_EMPTY");
  }

  const windowStartedAt = new Date(row.window_started_at).getTime();
  const databaseNow = new Date(row.database_now).getTime();
  if (
    !Number.isFinite(windowStartedAt) ||
    !Number.isFinite(databaseNow) ||
    !Number.isInteger(row.request_count) ||
    row.request_count < 1
  ) {
    throw new Error("POE_RATE_LIMIT_STORE_INVALID");
  }

  if (row.request_count > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((windowMs - (databaseNow - windowStartedAt)) / 1000),
      ),
    };
  }

  return { allowed: true };
}