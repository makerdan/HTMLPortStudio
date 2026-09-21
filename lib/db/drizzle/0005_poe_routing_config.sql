CREATE TABLE IF NOT EXISTS "poe_routing_config" (
  "id" varchar PRIMARY KEY NOT NULL,
  "fallback_model_ids" jsonb NOT NULL,
  "updated_by" varchar NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);