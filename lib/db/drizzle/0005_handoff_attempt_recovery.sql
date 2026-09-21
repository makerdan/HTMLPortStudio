ALTER TABLE "handoff_jobs"
  ADD COLUMN IF NOT EXISTS "attempt_id" varchar(64),
  ADD COLUMN IF NOT EXISTS "source_revision" varchar(128),
  ADD COLUMN IF NOT EXISTS "attempt_state" varchar(32) DEFAULT 'created' NOT NULL,
  ADD COLUMN IF NOT EXISTS "destination_project_id" text,
  ADD COLUMN IF NOT EXISTS "destination_project_url" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "handoff_jobs_owner_attempt_unique"
  ON "handoff_jobs" USING btree ("owner_id", "attempt_id");