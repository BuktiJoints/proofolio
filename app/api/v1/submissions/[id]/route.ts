import { currentUser } from "@/server/auth";
import { submissionDetail } from "@/server/domain/submissions";
import { uuidParam, ok, route } from "@/server/http";
export const GET = (
  _: Request,
  ctx: RouteContext<"/api/v1/submissions/[id]">,
) =>
  route(async () => {
    const user = await currentUser();
    const { id } = await ctx.params;
    uuidParam(id);
    return ok(await submissionDetail(id, user));
  });
