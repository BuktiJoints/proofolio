import { and, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { evidenceShares } from "@/server/db/schema";
import { uuidParam, ApiError, ok, route } from "@/server/http";
export const DELETE = (_: Request, ctx: RouteContext<"/api/v1/shares/[id]">) =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const [share] = await db
      .update(evidenceShares)
      .set({ revokedAt: new Date(), updatedAt: new Date() })
      .where(
        and(eq(evidenceShares.id, id), eq(evidenceShares.createdBy, user.id)),
      )
      .returning();
    if (!share)
      throw new ApiError(404, "SHARE_NOT_FOUND", "Tautan tidak ditemukan");
    return ok({ id, revoked: true });
  });
