CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY NOT NULL DEFAULT gen_random_uuid(),
  "email" varchar,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handoff_jobs" (
  "id" uuid PRIMARY KEY NOT NULL,
  "owner_id" varchar NOT NULL,
  "source_html" text NOT NULL,
  "project_name" text NOT NULL,
  "status" varchar(16) DEFAULT 'queued' NOT NULL,
  "project_id" text,
  "project_url" text,
  "current_step" text,
  "error" text,
  "lease_expires_at" timestamp with time zone,
  "lease_token" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "handoff_jobs_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoff_jobs_owner_idx" ON "handoff_jobs" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoff_jobs_resume_idx" ON "handoff_jobs" USING btree ("status","lease_expires_at");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handoff_steps" (
  "id" uuid PRIMARY KEY NOT NULL,
  "job_id" uuid NOT NULL,
  "position" integer NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL,
  "status" varchar(16) DEFAULT 'pending' NOT NULL,
  "error" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "handoff_steps_job_id_handoff_jobs_id_fk"
    FOREIGN KEY ("job_id") REFERENCES "handoff_jobs"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "handoff_steps_job_position_unique" ON "handoff_steps" USING btree ("job_id","position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handoff_steps_job_idx" ON "handoff_steps" USING btree ("job_id","position");