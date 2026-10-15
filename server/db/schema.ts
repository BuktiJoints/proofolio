import { relations, sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const roleEnum = pgEnum("user_role", ["STUDENT", "ASSESSOR"]);
export const rubricStatusEnum = pgEnum("rubric_status", [
  "DRAFT",
  "PUBLISHED",
  "ARCHIVED",
]);
export const submissionStatusEnum = pgEnum("submission_status", [
  "QUEUED",
  "ANALYZING",
  "ANALYSIS_FAILED",
  "AWAITING_REVIEW",
  "IN_REVIEW",
  "COMPLETED",
]);
export const jobStatusEnum = pgEnum("job_status", [
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "RETRY_SCHEDULED",
  "FAILED",
]);
export const evidenceStatusEnum = pgEnum("evidence_status", [
  "OBSERVED",
  "NOT_OBSERVED",
  "UNCERTAIN",
]);
export const evidenceQualityEnum = pgEnum("evidence_quality", [
  "CLEAR",
  "PARTIAL",
  "OCCLUDED",
]);
export const reviewDecisionEnum = pgEnum("review_decision", [
  "CONFIRMED",
  "REJECTED",
  "ADJUSTED",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 80 }).notNull().unique(),
  ...timestamps,
});

// Better Auth core models. Names are explicit to keep migrations predictable.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  role: roleEnum("role").default("STUDENT").notNull(),
  registrationIntent: varchar("registration_intent", { length: 20 })
    .default("STUDENT")
    .notNull(),
  accessStatus: varchar("access_status", { length: 20 })
    .default("ACTIVE")
    .notNull(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  ...timestamps,
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  ...timestamps,
});
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  password: text("password"),
  ...timestamps,
});
export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ...timestamps,
});

export const studentProfiles = pgTable("student_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  nisn: varchar("nisn", { length: 10 }).unique(),
  phone: varchar("phone", { length: 20 }),
  schoolName: varchar("school_name", { length: 180 }),
  programKeahlian: varchar("program_keahlian", { length: 180 }),
  notificationStatusEnabled: boolean("notification_status_enabled")
    .default(true)
    .notNull(),
  ...timestamps,
});

export const rubrics = pgTable("rubrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  programKeahlian: varchar("program_keahlian", { length: 180 }),
  partnerName: varchar("partner_name", { length: 180 }),
  requirements: text("requirements"),
  status: rubricStatusEnum("status").default("DRAFT").notNull(),
  activeVersionId: uuid("active_version_id"),
  createdBy: text("created_by")
    .references(() => users.id)
    .notNull(),
  ...timestamps,
});
export const rubricVersions = pgTable(
  "rubric_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rubricId: uuid("rubric_id")
      .references(() => rubrics.id, { onDelete: "cascade" })
      .notNull(),
    version: integer("version").notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description"),
    programKeahlian: varchar("program_keahlian", { length: 180 }),
    partnerName: varchar("partner_name", { length: 180 }),
    requirements: text("requirements"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdBy: text("created_by")
      .references(() => users.id)
      .notNull(),
    ...timestamps,
  },
  (t) => [uniqueIndex("rubric_version_unique").on(t.rubricId, t.version)],
);
export const rubricCriteria = pgTable(
  "rubric_criteria",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rubricVersionId: uuid("rubric_version_id")
      .references(() => rubricVersions.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    description: text("description").notNull(),
    order: integer("order_index").notNull(),
    required: boolean("required").default(true).notNull(),
    maxScore: integer("max_score").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("criterion_code_unique").on(t.rubricVersionId, t.code),
    uniqueIndex("criterion_order_unique").on(t.rubricVersionId, t.order),
  ],
);

export const submissions = pgTable("submissions", {
  portfolioIncluded: boolean("portfolio_included").default(true).notNull(),
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .references(() => organizations.id)
    .notNull(),
  studentId: text("student_id")
    .references(() => users.id)
    .notNull(),
  rubricVersionId: uuid("rubric_version_id")
    .references(() => rubricVersions.id)
    .notNull(),
  status: submissionStatusEnum("status").default("QUEUED").notNull(),
  originalFilename: text("original_filename").notNull(),
  objectKey: text("object_key").notNull().unique(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  durationMs: integer("duration_ms").notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  normalizedScore: numeric("normalized_score", { precision: 5, scale: 2 }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  ...timestamps,
});
export const analysisJobs = pgTable(
  "analysis_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    status: jobStatusEnum("status").default("PENDING").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockedBy: text("locked_by"),
    lastError: text("last_error"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("analysis_job_active_unique")
      .on(t.submissionId)
      .where(sql`${t.status} in ('PENDING', 'RUNNING', 'RETRY_SCHEDULED')`),
  ],
);
export const analysisRuns = pgTable("analysis_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .references(() => submissions.id, { onDelete: "cascade" })
    .notNull(),
  jobId: uuid("job_id")
    .references(() => analysisJobs.id)
    .notNull(),
  model: text("model").notNull(),
  promptVersion: text("prompt_version").notNull(),
  rawResponse: jsonb("raw_response"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  ...timestamps,
});
export const analysisEvidence = pgTable(
  "analysis_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisRunId: uuid("analysis_run_id")
      .references(() => analysisRuns.id, { onDelete: "cascade" })
      .notNull(),
    criterionId: uuid("criterion_id")
      .references(() => rubricCriteria.id)
      .notNull(),
    status: evidenceStatusEnum("status").notNull(),
    startMs: integer("start_ms"),
    endMs: integer("end_ms"),
    evidence: text("evidence").notNull(),
    quality: evidenceQualityEnum("quality").notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("analysis_evidence_criterion_unique").on(
      t.analysisRunId,
      t.criterionId,
    ),
  ],
);
export const assessmentReviews = pgTable("assessment_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .references(() => submissions.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  assessorId: text("assessor_id")
    .references(() => users.id)
    .notNull(),
  feedback: text("feedback"),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  ...timestamps,
});
export const reviewItems = pgTable(
  "review_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reviewId: uuid("review_id")
      .references(() => assessmentReviews.id, { onDelete: "cascade" })
      .notNull(),
    criterionId: uuid("criterion_id")
      .references(() => rubricCriteria.id)
      .notNull(),
    decision: reviewDecisionEnum("decision").notNull(),
    score: integer("score").notNull(),
    note: text("note"),
    ...timestamps,
  },
  (t) => [uniqueIndex("review_criterion_unique").on(t.reviewId, t.criterionId)],
);
export const evidenceShares = pgTable("evidence_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .references(() => submissions.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: text("created_by")
    .references(() => users.id)
    .notNull(),
  ...timestamps,
});
export const submissionEvents = pgTable("submission_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  submissionId: uuid("submission_id")
    .references(() => submissions.id, { onDelete: "cascade" })
    .notNull(),
  actorId: text("actor_id").references(() => users.id),
  type: varchar("type", { length: 80 }).notNull(),
  payload: jsonb("payload")
    .default(sql`'{}'::jsonb`)
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const submissionRelations = relations(submissions, ({ one }) => ({
  student: one(users, {
    fields: [submissions.studentId],
    references: [users.id],
  }),
  rubricVersion: one(rubricVersions, {
    fields: [submissions.rubricVersionId],
    references: [rubricVersions.id],
  }),
}));

export const assessorApplications = pgTable("assessor_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  employeeId: varchar("employee_id", { length: 80 }).notNull(),
  institution: varchar("institution", { length: 180 }).notNull(),
  programKeahlian: varchar("program_keahlian", { length: 180 }).notNull(),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: varchar("reviewed_by", { length: 180 }),
  ...timestamps,
});
export const assessorProfiles = pgTable("assessor_profiles", {
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .primaryKey(),
  employeeId: varchar("employee_id", { length: 80 }).notNull().unique(),
  institution: varchar("institution", { length: 180 }).notNull(),
  programKeahlian: varchar("program_keahlian", { length: 180 }).notNull(),
  ...timestamps,
});

export const portfolioShares = pgTable("portfolio_shares", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...timestamps,
});
