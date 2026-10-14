import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import {
  assessmentReviews,
  reviewItems,
  rubricCriteria,
  submissions,
  submissionEvents,
} from "@/server/db/schema";
import { transitionSubmission } from "./states";
import { normalizedScore } from "./scoring";
import { ApiError } from "@/server/http";

export const reviewInput = z
  .object({
    feedback: z.string().trim().max(4000).default(""),
    items: z
      .array(
        z.object({
          criterionId: z.string().uuid(),
          decision: z.enum(["CONFIRMED", "REJECTED", "ADJUSTED"]),
          score: z.number().int().nonnegative(),
          note: z.string().trim().max(2000).nullable().optional(),
        }),
      )
      .max(50),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.items.map((item) => item.criterionId)).size !==
      value.items.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Kriteria penilaian harus unik",
      });
  });
export async function saveReview(
  submissionId: string,
  assessorId: string,
  input: z.infer<typeof reviewInput>,
  finalize = false,
) {
  return db.transaction(async (tx) => {
    const [review] = await tx
      .select()
      .from(assessmentReviews)
      .where(
        and(
          eq(assessmentReviews.submissionId, submissionId),
          eq(assessmentReviews.assessorId, assessorId),
        ),
      )
      .limit(1)
      .for("update");
    if (!review)
      throw new ApiError(
        409,
        "REVIEW_NOT_STARTED",
        "Mulai review terlebih dahulu",
      );
    if (review.finalizedAt) {
      if (!finalize)
        throw new ApiError(
          409,
          "REVIEW_FINALIZED",
          "Review sudah diselesaikan",
        );
      const [completed] = await tx
        .select()
        .from(submissions)
        .where(eq(submissions.id, submissionId))
        .limit(1);
      return { ...review, normalizedScore: Number(completed.normalizedScore) };
    }
    const [submission] = await tx
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    const criteria = await tx
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, submission.rubricVersionId));
    const byId = new Map(criteria.map((c) => [c.id, c]));
    for (const item of input.items) {
      const criterion = byId.get(item.criterionId);
      if (!criterion)
        throw new ApiError(
          400,
          "INVALID_CRITERION",
          "Kriteria tidak termasuk rubrik",
          { criterionId: item.criterionId },
        );
      if (item.score > criterion.maxScore)
        throw new ApiError(
          400,
          "INVALID_SCORE",
          "Nilai melebihi nilai maksimal",
          { criterionId: item.criterionId },
        );
    }
    await tx.delete(reviewItems).where(eq(reviewItems.reviewId, review.id));
    if (input.items.length)
      await tx.insert(reviewItems).values(
        input.items.map((i) => ({
          reviewId: review.id,
          criterionId: i.criterionId,
          decision: i.decision,
          score: i.score,
          note: i.note,
        })),
      );
    if (!finalize) {
      await tx
        .insert(submissionEvents)
        .values({ submissionId, actorId: assessorId, type: "REVIEW_SAVED" });
      const [saved] = await tx
        .update(assessmentReviews)
        .set({ feedback: input.feedback, updatedAt: new Date() })
        .where(eq(assessmentReviews.id, review.id))
        .returning();
      return saved;
    }
    if (!input.feedback)
      throw new ApiError(400, "FEEDBACK_REQUIRED", "Feedback wajib diisi");
    const scored = new Map(input.items.map((i) => [i.criterionId, i]));
    const missing = criteria.filter((c) => c.required && !scored.has(c.id));
    if (missing.length)
      throw new ApiError(
        400,
        "INCOMPLETE_REVIEW",
        "Semua kriteria wajib harus dinilai",
        { criterionIds: missing.map((c) => c.id) },
      );
    const score = normalizedScore(
      criteria.map((criterion) => ({
        criterionId: criterion.id,
        score: scored.get(criterion.id)?.score ?? 0,
        maxScore: criterion.maxScore,
        required: criterion.required,
      })),
    );
    const now = new Date();
    const [saved] = await tx
      .update(assessmentReviews)
      .set({ feedback: input.feedback, finalizedAt: now, updatedAt: now })
      .where(eq(assessmentReviews.id, review.id))
      .returning();
    await transitionSubmission(
      tx,
      submission,
      "COMPLETED",
      {
        actorId: assessorId,
        type: "REVIEW_FINALIZED",
        payload: { normalizedScore: score },
      },
      { normalizedScore: String(score), completedAt: now },
    );
    return { ...saved, normalizedScore: score };
  });
}
