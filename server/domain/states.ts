import { eq } from "drizzle-orm";
import { submissions, submissionEvents } from "@/server/db/schema";
import type { db } from "@/server/db";
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
