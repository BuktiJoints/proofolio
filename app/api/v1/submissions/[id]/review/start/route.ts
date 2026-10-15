import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { assessmentReviews, submissions } from "@/server/db/schema";
import { transitionSubmission } from "@/server/domain/states";
import { uuidParam, ApiError, ok, route } from "@/server/http";
export const POST = (
  _: Request,
  ctx: RouteContext<"/api/v1/submissions/[id]/review/start">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const result = await db.transaction(async (tx) => {
      const [submission] = await tx
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.id, id),
            eq(submissions.organizationId, user.organizationId),
          ),
        )
        .limit(1)
        .for("update");
      if (!submission)
        throw new ApiError(
          404,
          "SUBMISSION_NOT_FOUND",
          "Pengumpulan tidak ditemukan",
        );
      const [existing] = await tx
        .select()
        .from(assessmentReviews)
        .where(eq(assessmentReviews.submissionId, id))
        .limit(1);
      if (existing) {
        if (existing.assessorId !== user.id)
          throw new ApiError(
            409,
            "REVIEW_ALREADY_CLAIMED",
            "Pengumpulan sedang dinilai asesor lain",
          );
        return { review: existing, status: 200 };
      }
      if (submission.status !== "AWAITING_REVIEW")
        throw new ApiError(
          409,
          "REVIEW_NOT_READY",
          "Analisis AI belum siap untuk direview",
        );
      const [review] = await tx
        .insert(assessmentReviews)
        .values({ submissionId: id, assessorId: user.id })
        .returning();
      await transitionSubmission(tx, submission, "IN_REVIEW", {
        actorId: user.id,
        type: "REVIEW_STARTED",
      });
      return { review, status: 201 };
    });
    return ok(result.review, { status: result.status });
  });
