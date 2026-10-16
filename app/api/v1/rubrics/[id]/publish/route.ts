import { z } from "zod";
import { currentUser } from "@/server/auth";
import { publishRubricVersion } from "@/server/domain/rubrics";
import { uuidParam, ok, route, requestJson } from "@/server/http";
export const POST = (
  request: Request,
  ctx: RouteContext<"/api/v1/rubrics/[id]/publish">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const body = z
      .object({ versionId: z.uuid().optional() })
      .parse((await requestJson(request, true)) ?? {});
    return ok(
      await publishRubricVersion(id, user.organizationId, body.versionId),
    );
  });
