import { eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  studentProfiles,
  assessorApplications,
  assessorProfiles,
} from "@/server/db/schema";
import { ok, route } from "@/server/http";

export const GET = () =>
  route(async () => {
    const user = await currentUser(undefined, true);
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id))
      .limit(1);
    const [application] = await db
      .select()
      .from(assessorApplications)
      .where(eq(assessorApplications.userId, user.id))
      .limit(1);
    const [assessorProfile] = await db
      .select()
      .from(assessorProfiles)
      .where(eq(assessorProfiles.userId, user.id))
      .limit(1);
    return ok({
      user,
      profile: profile ?? null,
      assessorApplication: application ?? null,
      assessorProfile: assessorProfile ?? null,
    });
  });
