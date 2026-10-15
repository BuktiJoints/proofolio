import { randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { portfolioShares, users } from "@/server/db/schema";
import { hashToken } from "@/server/domain/shares";
import { env } from "@/server/env";
import { ok, route } from "@/server/http";
export const GET = () =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const [share] = await db
      .select({ id: portfolioShares.id, expiresAt: portfolioShares.expiresAt })
      .from(portfolioShares)
      .where(
        and(
          eq(portfolioShares.userId, user.id),
          isNull(portfolioShares.revokedAt),
          gt(portfolioShares.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(portfolioShares.createdAt))
      .limit(1);
    return ok(share ?? null);
  });
export const POST = () =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + env().SHARE_TTL_HOURS * 3600000);
    const share = await db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, user.id))
        .for("update");
      await tx
        .update(portfolioShares)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(portfolioShares.userId, user.id),
            isNull(portfolioShares.revokedAt),
          ),
        );
      const [created] = await tx
        .insert(portfolioShares)
        .values({ userId: user.id, tokenHash: hashToken(token), expiresAt })
        .returning({ id: portfolioShares.id });
      return created;
    });
    return ok(
      {
        ...share,
        token,
        url: `${env().BETTER_AUTH_URL}/p/${token}`,
        expiresAt,
      },
      { status: 201 },
    );
  });
export const DELETE = () =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    await db.transaction(async (tx) => {
      await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, user.id))
        .for("update");
      await tx
        .update(portfolioShares)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(portfolioShares.userId, user.id),
            isNull(portfolioShares.revokedAt),
          ),
        );
    });
    return ok({ revoked: true });
  });
