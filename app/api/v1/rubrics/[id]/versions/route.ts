import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics } from "@/server/db/schema";
import { createVersion, rubricInput } from "@/server/domain/rubrics";
import { ApiError, ok, route } from "@/server/http";

export const POST = (request: Request, ctx: RouteContext<"/api/v1/rubrics/[id]/versions">) => route(async () => { const user = await currentUser(["ASSESSOR"]); const { id } = await ctx.params; const [rubric] = await db.select().from(rubrics).where(and(eq(rubrics.id, id), eq(rubrics.organizationId, user.organizationId))).limit(1); if (!rubric) throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan"); const raw = await request.text(); const body = raw ? rubricInput.parse(JSON.parse(raw)) : undefined; const version = await createVersion(id, user.id, body); await db.update(rubrics).set({ status: "DRAFT", activeVersionId: null, title: version.title, description: version.description, updatedAt: new Date() }).where(eq(rubrics.id, id)); return ok(version, { status: 201 }); });
