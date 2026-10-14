import { currentUser } from "@/server/auth";
import { route } from "@/server/http";
import { videoResponse } from "@/server/video-response";
export const GET = (request: Request, ctx: RouteContext<"/api/v1/submissions/[id]/video">) => route(async () => { const user = await currentUser(); const { id } = await ctx.params; return videoResponse(id, user, request.headers.get("range")); });
