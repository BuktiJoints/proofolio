import { eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { studentProfiles } from "@/server/db/schema";
import { ok, route } from "@/server/http";

export const GET = () => route(async () => {
  const user = await currentUser();
  const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, user.id)).limit(1);
  return ok({ user, profile: profile ?? null });
});
