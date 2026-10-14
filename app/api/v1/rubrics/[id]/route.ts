import { currentUser } from "@/server/auth";
import { rubricDetail } from "@/server/domain/rubrics";
import { uuidParam, ApiError, ok, route } from "@/server/http";

export const GET = (_: Request, ctx: RouteContext<"/api/v1/rubrics/[id]">) =>
  route(async () => {
    const user = await currentUser();
    const { id } = await ctx.params;
    uuidParam(id);
    const result = await rubricDetail(id, user.organizationId);
    if (user.role === "STUDENT" && result.status !== "PUBLISHED")
      throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
    return ok(result);
  });
