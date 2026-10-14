import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { studentProfiles, users } from "@/server/db/schema";
import { ok, route } from "@/server/http";

const input = z.object({ name: z.string().trim().min(2).max(120), schoolName: z.string().trim().min(2).max(180), programKeahlian: z.string().trim().min(2).max(180) });
export const PATCH = (request: Request) => route(async () => {
  const user = await currentUser(["STUDENT"]); const body = input.parse(await request.json());
  await db.transaction(async (tx) => {
    await tx.update(users).set({ name: body.name, updatedAt: new Date() }).where(eq(users.id, user.id));
    await tx.insert(studentProfiles).values({ userId: user.id, schoolName: body.schoolName, programKeahlian: body.programKeahlian }).onConflictDoUpdate({ target: studentProfiles.userId, set: { schoolName: body.schoolName, programKeahlian: body.programKeahlian, updatedAt: new Date() } });
  });
  return ok(body);
});
