import { currentUser } from "@/server/auth";
import {
  deleteDraftVersion,
  rubricInput,
  updateDraftVersion,
} from "@/server/domain/rubrics";
import { uuidParam, ok, route, requestJson } from "@/server/http";
type Context = RouteContext<"/api/v1/rubrics/[id]/versions/[versionId]">;
export const PUT = (request: Request, ctx: Context) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id, versionId } = await ctx.params;
    uuidParam(id);
    uuidParam(versionId);
    return ok(
      await updateDraftVersion(
        id,
        user.organizationId,
        rubricInput.parse(await requestJson(request)),
        versionId,
      ),
    );
  });
export const DELETE = (_: Request, ctx: Context) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id, versionId } = await ctx.params;
    uuidParam(id);
    uuidParam(versionId);
    return ok(await deleteDraftVersion(id, user.organizationId, versionId));
  });
