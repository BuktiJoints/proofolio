import { currentUser } from "@/server/auth";
import { rubricInput, updateDraftVersion } from "@/server/domain/rubrics";
import { uuidParam, ok, route, requestJson } from "@/server/http";
export const PUT = (
  request: Request,
  ctx: RouteContext<"/api/v1/rubrics/[id]/draft">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
    return ok(
      await updateDraftVersion(
        id,
        user.organizationId,
        rubricInput.parse(await requestJson(request)),
      ),
    );
  });
