ALTER TABLE "handoff_jobs"
  ADD COLUMN IF NOT EXISTS "source_bundle" jsonb;