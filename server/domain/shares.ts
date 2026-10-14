import { createHash } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { assessmentReviews, evidenceShares, rubricVersions, studentProfiles, submissions, users } from "@/server/db/schema";
import { ApiError } from "@/server/http";
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export async function publicEvidence(token: string) {
  const [row] = await db.select({ share: evidenceShares, submission: submissions, studentName: users.name, profile: studentProfiles, review: assessmentReviews, rubric: rubricVersions }).from(evidenceShares).innerJoin(submissions, eq(submissions.id, evidenceShares.submissionId)).innerJoin(users, eq(users.id, submissions.studentId)).leftJoin(studentProfiles, eq(studentProfiles.userId, users.id)).innerJoin(assessmentReviews, eq(assessmentReviews.submissionId, submissions.id)).innerJoin(rubricVersions, eq(rubricVersions.id, submissions.rubricVersionId)).where(and(eq(evidenceShares.tokenHash, hashToken(token)), isNull(evidenceShares.revokedAt), gt(evidenceShares.expiresAt, new Date()), eq(submissions.status, "COMPLETED"))).limit(1);
  if (!row) throw new ApiError(404, "SHARE_NOT_FOUND", "Tautan tidak ditemukan atau sudah kedaluwarsa");
  return row;
}
