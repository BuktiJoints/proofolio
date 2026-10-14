import { currentUser } from "@/server/auth";
import { accessibleSubmission } from "@/server/domain/submissions";
import { reviewInput, saveReview } from "@/server/domain/reviews";
import { ok, route } from "@/server/http";
export const POST = (request: Request, ctx: RouteContext<"/api/v1/submissions/[id]/review/finalize">) => route(async () => { const user = await currentUser(["ASSESSOR"]); const { id } = await ctx.params; await accessibleSubmission(id, user); return ok(await saveReview(id, user.id, reviewInput.parse(await request.json()), true)); });
