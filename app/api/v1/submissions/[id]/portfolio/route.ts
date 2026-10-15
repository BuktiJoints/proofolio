import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { submissions } from "@/server/db/schema";
import { accessibleSubmission } from "@/server/domain/submissions";
import { ApiError, ok, route, uuidParam } from "@/server/http";
export const POST = (
  request: Request,
  ctx: RouteContext<"/api/v1/submissions/[id]/portfolio">,
) =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const submission = await accessibleSubmission(id, user);
    if (submission.status !== "COMPLETED")
      throw new ApiError(
        409,
        "SUBMISSION_NOT_COMPLETED",
        "Penilaian harus selesai sebelum ditambahkan ke portofolio",
      );
    await db
      .update(submissions)
      .set({ portfolioIncluded: true, updatedAt: new Date() })
      .where(
        and(
          eq(submissions.id, id),
          eq(submissions.studentId, user.id),
          eq(submissions.organizationId, user.organizationId),
        ),
      );
    return ok({ id, portfolioIncluded: true });
  });
