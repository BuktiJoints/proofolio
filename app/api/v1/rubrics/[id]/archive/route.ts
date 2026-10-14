import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics } from "@/server/db/schema";
import { ApiError, ok, route } from "@/server/http";
export const POST = (_: Request, ctx: RouteContext<"/api/v1/rubrics/[id]/archive">) => route(async () => { const user = await currentUser(["ASSESSOR"]); const { id } = await ctx.params; const [updated] = await db.update(rubrics).set({ status: "ARCHIVED", updatedAt: new Date() }).where(and(eq(rubrics.id, id), eq(rubrics.organizationId, user.organizationId))).returning(); if (!updated) throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan"); return ok(updated); });
