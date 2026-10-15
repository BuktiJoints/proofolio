import { and, eq, inArray } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { analysisJobs, submissions } from "@/server/db/schema";
import { transitionSubmission } from "@/server/domain/states";
import { uuidParam, ApiError, ok, route } from "@/server/http";
export const POST = (
  _: Request,
  ctx: RouteContext<"/api/v1/submissions/[id]/retry-analysis">,
) =>
  route(async () => {
    const user = await currentUser();
    const { id } = await ctx.params;
    uuidParam(id);
    await db.transaction(async (tx) => {
      const [submission] = await tx
        .select()
        .from(submissions)
        .where(
          and(
            eq(submissions.id, id),
            eq(submissions.organizationId, user.organizationId),
            user.role === "STUDENT"
              ? eq(submissions.studentId, user.id)
              : undefined,
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
      if (submission.status === "QUEUED") {
        const [active] = await tx
          .select()
          .from(analysisJobs)
          .where(
            and(
              eq(analysisJobs.submissionId, id),
              inArray(analysisJobs.status, [
                "PENDING",
                "RUNNING",
                "RETRY_SCHEDULED",
              ]),
            ),
          )
          .limit(1);
        if (active) return;
      }
      if (submission.status !== "ANALYSIS_FAILED")
        throw new ApiError(
          409,
          "RETRY_NOT_ALLOWED",
          "Analisis hanya dapat diulang setelah gagal",
        );
      await transitionSubmission(tx, submission, "QUEUED", {
        actorId: user.id,
        type: "ANALYSIS_RETRY_SCHEDULED",
      });
      await tx.insert(analysisJobs).values({ submissionId: id });
    });
    return ok({ id, status: "QUEUED" });
  });
