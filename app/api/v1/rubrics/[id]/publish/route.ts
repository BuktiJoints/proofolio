import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics, rubricVersions } from "@/server/db/schema";
import { ApiError, ok, route } from "@/server/http";

export const POST = (_: Request, ctx: RouteContext<"/api/v1/rubrics/[id]/publish">) => route(async () => { const user = await currentUser(["ASSESSOR"]); const { id } = await ctx.params; const result = await db.transaction(async (tx) => { const [rubric] = await tx.select().from(rubrics).where(and(eq(rubrics.id, id), eq(rubrics.organizationId, user.organizationId))).limit(1); if (!rubric) throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan"); const [version] = await tx.select().from(rubricVersions).where(eq(rubricVersions.rubricId, id)).orderBy(desc(rubricVersions.version)).limit(1); await tx.update(rubricVersions).set({ publishedAt: new Date() }).where(eq(rubricVersions.id, version.id)); const [updated] = await tx.update(rubrics).set({ status: "PUBLISHED", activeVersionId: version.id, updatedAt: new Date() }).where(eq(rubrics.id, id)).returning(); return updated; }); return ok(result); });
