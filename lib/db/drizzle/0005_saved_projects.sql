CREATE TABLE IF NOT EXISTS "saved_projects" (
  "id" uuid PRIMARY KEY NOT NULL,
  "owner_id" varchar NOT NULL,
  "name" varchar(120) NOT NULL,
  "source_type" varchar(32) NOT NULL,
  "entrypoint" varchar(512) NOT NULL,
  "source_bundle" jsonb NOT NULL,
  "analysis" jsonb NOT NULL,
  "editor_state" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "saved_projects_owner_id_users_id_fk"
    FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_projects_owner_updated_idx"
  ON "saved_projects" USING btree ("owner_id","updated_at");