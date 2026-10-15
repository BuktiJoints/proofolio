import { publicPortfolio } from "@/server/domain/portfolio";
import { ok, route } from "@/server/http";
export const GET = (
  _: Request,
  ctx: RouteContext<"/api/public/portfolios/[token]">,
) =>
  route(async () => {
    const { token } = await ctx.params;
    return ok(await publicPortfolio(token));
  });
