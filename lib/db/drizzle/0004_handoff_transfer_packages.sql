CREATE TABLE IF NOT EXISTS "handoff_transfer_packages" (
  "id" uuid PRIMARY KEY NOT NULL,
  "owner_id" varchar NOT NULL,
  "handoff_job_id" uuid,
  "source_bundle" jsonb NOT NULL,
  "manifest" jsonb NOT NULL,
  "manifest_hash" varchar(64) NOT NULL,
  "token_hash" varchar(64) NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "retrieval_limit" integer DEFAULT 1 NOT NULL,
  "retrieval_count" integer DEFAULT 0 NOT NULL,
  "revoked_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "handoff_transfer_packages_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade,
  CONSTRAINT "handoff_transfer_packages_handoff_job_id_handoff_jobs_id_fk"
    FOREIGN KEY ("handoff_job_id") REFERENCES "handoff_jobs"("id") ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "handoff_transfer_packages_token_hash_unique"
  ON "handoff_transfer_packages" USING btree ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoff_transfer_packages_owner_idx"
  ON "handoff_transfer_packages" USING btree ("owner_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoff_transfer_packages_expiry_idx"
  ON "handoff_transfer_packages" USING btree ("expires_at");