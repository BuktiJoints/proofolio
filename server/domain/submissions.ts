import { and, asc, desc, eq } from "drizzle-orm";
import type { CurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { analysisEvidence, analysisRuns, assessmentReviews, reviewItems, rubricCriteria, rubricVersions, submissions } from "@/server/db/schema";
import { ApiError } from "@/server/http";

export async function accessibleSubmission(id: string, user: CurrentUser) {
  const conditions = [eq(submissions.id, id), eq(submissions.organizationId, user.organizationId)];
  if (user.role === "STUDENT") conditions.push(eq(submissions.studentId, user.id));
  const [submission] = await db.select().from(submissions).where(and(...conditions)).limit(1);
  if (!submission) throw new ApiError(404, "SUBMISSION_NOT_FOUND", "Pengumpulan tidak ditemukan");
  return submission;
}
export async function submissionDetail(id: string, user: CurrentUser) {
  const submission = await accessibleSubmission(id, user);
  const [version] = await db.select().from(rubricVersions).where(eq(rubricVersions.id, submission.rubricVersionId)).limit(1);
  const criteria = await db.select().from(rubricCriteria).where(eq(rubricCriteria.rubricVersionId, submission.rubricVersionId)).orderBy(asc(rubricCriteria.order));
  const [run] = await db.select().from(analysisRuns).where(eq(analysisRuns.submissionId, id)).orderBy(desc(analysisRuns.createdAt)).limit(1);
  const evidence = run ? await db.select().from(analysisEvidence).where(eq(analysisEvidence.analysisRunId, run.id)) : [];
  const [review] = await db.select().from(assessmentReviews).where(eq(assessmentReviews.submissionId, id)).limit(1);
  const items = review ? await db.select().from(reviewItems).where(eq(reviewItems.reviewId, review.id)) : [];
  return { ...submission, rubricVersion: version, criteria, analysis: run ? { ...run, evidence } : null, review: review ? { ...review, items } : null };
}
