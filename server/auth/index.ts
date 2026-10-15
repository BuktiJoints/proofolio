import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { headers } from "next/headers";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import {
  accounts,
  organizations,
  sessions,
  users,
  verifications,
} from "@/server/db/schema";
import { env } from "@/server/env";
import { ApiError } from "@/server/http";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
    transaction: true,
  }),
  baseURL: env().BETTER_AUTH_URL,
  secret: env().BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  user: {
    changeEmail: { enabled: true },
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "STUDENT",
        input: false,
      },
      registrationIntent: {
        type: ["STUDENT", "ASSESSOR"],
        required: false,
        defaultValue: "STUDENT",
        input: true,
      },
      accessStatus: {
        type: "string",
        required: false,
        defaultValue: "ACTIVE",
        input: false,
      },
      organizationId: { type: "string", required: false, input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.slug, env().DEFAULT_ORGANIZATION_SLUG))
            .limit(1);
          if (!org) throw new Error("Default organization has not been seeded");
          return {
            data: {
              ...user,
              role: "STUDENT",
              organizationId: org.id,
              accessStatus:
                user.registrationIntent === "ASSESSOR" ? "PENDING" : "ACTIVE",
            },
          };
        },
      },
    },
  },
  advanced: { database: { generateId: () => crypto.randomUUID() } },
});

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "ASSESSOR";
  organizationId: string;
  accessStatus: string;
};
export async function currentUser(
  roles?: CurrentUser["role"][],
  allowPending = false,
): Promise<CurrentUser> {
  await connection();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    throw new ApiError(401, "UNAUTHORIZED", "Silakan masuk terlebih dahulu");
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  if (!user) throw new ApiError(401, "UNAUTHORIZED", "Sesi tidak valid");
  if (!allowPending && user.accessStatus !== "ACTIVE")
    throw new ApiError(
      403,
      user.accessStatus === "REJECTED"
        ? "ASSESSOR_APPLICATION_REJECTED"
        : "ASSESSOR_APPROVAL_PENDING",
      "Akses asesor menunggu persetujuan administrator",
    );
  if (roles && !roles.includes(user.role))
    throw new ApiError(403, "FORBIDDEN", "Anda tidak memiliki akses");
  return user as CurrentUser;
}
