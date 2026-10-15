import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { studentProfiles, users } from "@/server/db/schema";
import { ApiError, ok, route } from "@/server/http";

const optionalPhone = z
  .string()
  .trim()
  .regex(/^(?:\+62|62|0)8[1-9][0-9]{6,11}$/, "Nomor telepon Indonesia tidak valid")
  .transform((value) => `+62${value.replace(/^(?:\+62|62|0)/, "")}`)
  .nullable()
  .optional();
const input = z.object({
  name: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().min(2).max(180),
  programKeahlian: z.string().trim().min(2).max(180),
  nisn: z.string().trim().regex(/^\d{10}$/, "NISN harus terdiri dari 10 digit").nullable().optional(),
  phone: optionalPhone,
  image: z.string().trim().url().max(2048).nullable().optional(),
  notificationStatusEnabled: z.boolean().optional(),
});
function postgresCode(error: unknown): string | undefined {
  let current = error;
  for (let depth = 0; depth < 4 && typeof current === "object" && current !== null; depth++) {
    if ("code" in current && typeof current.code === "string") return current.code;
    current = "cause" in current ? current.cause : undefined;
  }
}
export const PATCH = (request: Request) => route(async () => {
  const user = await currentUser(["STUDENT"]); const body = input.parse(await request.json());
  let profile: typeof studentProfiles.$inferSelect;
  try {
    profile = await db.transaction(async (tx) => {
    await tx.update(users).set({ name: body.name, ...(body.image !== undefined ? { image: body.image } : {}), updatedAt: new Date() }).where(eq(users.id, user.id));
    const [saved] = await tx.insert(studentProfiles).values({
      userId: user.id,
      schoolName: body.schoolName,
      programKeahlian: body.programKeahlian,
      ...(body.nisn !== undefined ? { nisn: body.nisn } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.notificationStatusEnabled !== undefined ? { notificationStatusEnabled: body.notificationStatusEnabled } : {}),
    }).onConflictDoUpdate({ target: studentProfiles.userId, set: {
      schoolName: body.schoolName,
      programKeahlian: body.programKeahlian,
      ...(body.nisn !== undefined ? { nisn: body.nisn } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.notificationStatusEnabled !== undefined ? { notificationStatusEnabled: body.notificationStatusEnabled } : {}),
      updatedAt: new Date(),
    } }).returning();
    return saved;
    });
  } catch (error) {
    if (postgresCode(error) === "23505")
      throw new ApiError(409, "NISN_ALREADY_USED", "NISN sudah digunakan akun lain", { nisn: ["NISN sudah digunakan"] });
    throw error;
  }
  return ok(profile);
});
