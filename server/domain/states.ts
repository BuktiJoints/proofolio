import { eq } from "drizzle-orm";
import { submissions, submissionEvents } from "@/server/db/schema";
import type { db } from "@/server/db";
import type { PoolClient } from "pg";
import { ApiError } from "@/server/http";

const transitions: Record<string, string[]> = {
  QUEUED: ["ANALYZING"],
  ANALYZING: ["AWAITING_REVIEW", "ANALYSIS_FAILED"],
  ANALYSIS_FAILED: ["QUEUED"],
  AWAITING_REVIEW: ["IN_REVIEW"],
  IN_REVIEW: ["COMPLETED"],
  COMPLETED: [],
};
export function assertTransition(from: string, to: string) {
  if (!transitions[from]?.includes(to))
    throw new ApiError(
      409,
      "INVALID_STATUS_TRANSITION",
      `Status ${from} tidak dapat diubah menjadi ${to}`,
    );
}

// Call within the transaction holding the submission row lock.
export async function transitionSubmission(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  submission: {
    id: string;
    status: typeof submissions.$inferSelect.status;
  },
  to: typeof submissions.$inferSelect.status,
  event: { type: string; actorId?: string; payload?: Record<string, unknown> },
  extra: { normalizedScore?: string; completedAt?: Date } = {},
) {
  assertTransition(submission.status, to);
  await tx
    .update(submissions)
    .set({ ...extra, status: to, updatedAt: new Date() })
    .where(eq(submissions.id, submission.id));
  await tx
    .insert(submissionEvents)
    .values({ submissionId: submission.id, ...event });
}

// Worker claims use PostgreSQL SKIP LOCKED through a native client. Keeping the
// transition and its audit event here prevents the queue adapter from bypassing
// the same state machine used by HTTP routes.
export async function transitionSubmissionWithClient(
  client: PoolClient,
  submission: { id: string; status: typeof submissions.$inferSelect.status },
  to: typeof submissions.$inferSelect.status,
  event: { type: string; payload?: Record<string, unknown> },
) {
  assertTransition(submission.status, to);
  await client.query(
    "update submissions set status=$2, updated_at=now() where id=$1",
    [submission.id, to],
  );
  await client.query(
    "insert into submission_events (submission_id, type, payload) values ($1, $2, $3::jsonb)",
    [submission.id, event.type, JSON.stringify(event.payload ?? {})],
  );
}
