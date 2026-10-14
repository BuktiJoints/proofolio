import { eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { analysisJobs, submissionEvents, submissions } from "@/server/db/schema";
import { accessibleSubmission } from "@/server/domain/submissions";
import { ApiError, ok, route } from "@/server/http";
export const POST = (_: Request, ctx: RouteContext<"/api/v1/submissions/[id]/retry-analysis">) => route(async () => { const user = await currentUser(); const { id } = await ctx.params; const submission = await accessibleSubmission(id, user); if (submission.status !== "ANALYSIS_FAILED") throw new ApiError(409, "RETRY_NOT_ALLOWED", "Analisis hanya dapat diulang setelah gagal"); await db.transaction(async (tx) => { await tx.update(submissions).set({ status: "QUEUED", updatedAt: new Date() }).where(eq(submissions.id, id)); await tx.insert(analysisJobs).values({ submissionId: id }); await tx.insert(submissionEvents).values({ submissionId: id, actorId: user.id, type: "ANALYSIS_RETRIED" }); }); return ok({ id, status: "QUEUED" }); });
