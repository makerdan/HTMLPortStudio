CREATE TABLE IF NOT EXISTS "poe_chat_rate_limits" (
  "client_ip" text PRIMARY KEY NOT NULL,
  "window_started_at" timestamp with time zone NOT NULL,
  "request_count" integer NOT NULL
);