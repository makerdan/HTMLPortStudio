import { relations } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { usersTable } from "./auth";

export const handoffJobsTable = pgTable(
  "handoff_jobs",
  {
    id: uuid("id").primaryKey(),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    sourceHtml: text("source_html").notNull(),
    sourceBundle: jsonb("source_bundle"),
    projectName: text("project_name").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("queued"),
    projectId: text("project_id"),
    projectUrl: text("project_url"),
    currentStep: text("current_step"),
    error: text("error"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    leaseToken: uuid("lease_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("handoff_jobs_owner_idx").on(table.ownerId),
    index("handoff_jobs_resume_idx").on(table.status, table.leaseExpiresAt),
  ],
);

export const handoffStepsTable = pgTable(
  "handoff_steps",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => handoffJobsTable.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    error: text("error"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("handoff_steps_job_position_unique").on(table.jobId, table.position),
    index("handoff_steps_job_idx").on(table.jobId, table.position),
  ],
);

export const handoffTransferPackagesTable = pgTable(
  "handoff_transfer_packages",
  {
    id: uuid("id").primaryKey(),
    ownerId: varchar("owner_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    handoffJobId: uuid("handoff_job_id").references(() => handoffJobsTable.id, {
      onDelete: "set null",
    }),
    sourceBundle: jsonb("source_bundle").notNull(),
    manifest: jsonb("manifest").notNull(),
    manifestHash: varchar("manifest_hash", { length: 64 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    retrievalLimit: integer("retrieval_limit").notNull().default(1),
    retrievalCount: integer("retrieval_count").notNull().default(0),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("handoff_transfer_packages_token_hash_unique").on(table.tokenHash),
    index("handoff_transfer_packages_owner_idx").on(table.ownerId, table.createdAt),
    index("handoff_transfer_packages_expiry_idx").on(table.expiresAt),
  ],
);

export const handoffJobsRelations = relations(handoffJobsTable, ({ many, one }) => ({
  owner: one(usersTable, {
    fields: [handoffJobsTable.ownerId],
    references: [usersTable.id],
  }),
  steps: many(handoffStepsTable),
  transferPackages: many(handoffTransferPackagesTable),
}));

export const handoffStepsRelations = relations(handoffStepsTable, ({ one }) => ({
  job: one(handoffJobsTable, {
    fields: [handoffStepsTable.jobId],
    references: [handoffJobsTable.id],
  }),
}));

export const handoffTransferPackagesRelations = relations(
  handoffTransferPackagesTable,
  ({ one }) => ({
    owner: one(usersTable, {
      fields: [handoffTransferPackagesTable.ownerId],
      references: [usersTable.id],
    }),
    handoffJob: one(handoffJobsTable, {
      fields: [handoffTransferPackagesTable.handoffJobId],
      references: [handoffJobsTable.id],
    }),
  }),
);

export type HandoffJobRow = typeof handoffJobsTable.$inferSelect;
export type HandoffStepRow = typeof handoffStepsTable.$inferSelect;
export type HandoffTransferPackageRow = typeof handoffTransferPackagesTable.$inferSelect;