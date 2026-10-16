import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics } from "@/server/db/schema";
import { createVersion, rubricInput } from "@/server/domain/rubrics";
import { uuidParam, ApiError, ok, route, requestJson } from "@/server/http";

export const POST = (
  request: Request,
  ctx: RouteContext<"/api/v1/rubrics/[id]/versions">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const [rubric] = await db
      .select()
      .from(rubrics)
      .where(
        and(
          eq(rubrics.id, id),
          eq(rubrics.organizationId, user.organizationId),
        ),
      )
      .limit(1);
    if (!rubric)
      throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
    const raw = await requestJson(request, true);
    const body = raw === undefined ? undefined : rubricInput.parse(raw);
    const version = await createVersion(id, user.id, body, user.organizationId);
    return ok(version, { status: 201 });
  });
