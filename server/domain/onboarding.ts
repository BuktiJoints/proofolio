import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import {
  assessorApplications,
  assessorProfiles,
  organizations,
  studentProfiles,
  users,
} from "@/server/db/schema";
import { ApiError } from "@/server/http";

import { registrationInput } from "./onboarding-input";
export { phoneInput } from "./onboarding-input";
export async function registerAccount(request: Request) {
  const body = registrationInput.parse(await request.json());
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.set("content-type", "application/json");
  const result = await auth.handler(
    new Request(new URL("/api/auth/sign-up/email", request.url), {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: body.name,
        email: body.email,
        password: body.password,
        registrationIntent: body.intent,
      }),
    }),
  );
  if (!result.ok)
    throw new ApiError(
      result.status === 429 ? 429 : 400,
      "REGISTRATION_FAILED",
      "Pendaftaran belum berhasil. Periksa data atau gunakan email lain.",
    );
  const registered = await result.json();
  const id = registered.user.id as string;
  try {
    if (body.intent === "ASSESSOR")
      await db
        .insert(assessorApplications)
        .values({
          userId: id,
          employeeId: body.employeeId,
          institution: body.schoolName,
          programKeahlian: body.programKeahlian,
        });
    else
      await db
        .insert(studentProfiles)
        .values({
          userId: id,
          nisn: body.nisn,
          phone: body.phone,
          schoolName: body.schoolName,
          programKeahlian: body.programKeahlian,
        });
  } catch {
    await db.delete(users).where(eq(users.id, id));
    throw new ApiError(
      409,
      "REGISTRATION_PROFILE_CONFLICT",
      "Data pendaftaran belum dapat disimpan. Periksa NISN atau coba kembali.",
    );
  }
  const responseHeaders = new Headers({ "Cache-Control": "no-store" });
  for (const cookie of result.headers.getSetCookie())
    responseHeaders.append("Set-Cookie", cookie);
  return Response.json(
    {
      data: {
        id,
        accessStatus: body.intent === "ASSESSOR" ? "PENDING" : "ACTIVE",
      },
    },
    { status: 201, headers: responseHeaders },
  );
}

export async function reviewAssessorApplication(input: {
  id: string;
  organizationId?: string;
  reviewedBy: string;
  decision: "APPROVED" | "REJECTED";
}) {
  const id = z.uuid().parse(input.id);
  const reviewedBy = z.string().trim().min(2).max(180).parse(input.reviewedBy);
  return db.transaction(async (tx) => {
    const [application] = await tx
      .select()
      .from(assessorApplications)
      .where(eq(assessorApplications.id, id))
      .for("update");
    if (!application)
      throw new ApiError(
        404,
        "APPLICATION_NOT_FOUND",
        "Permohonan tidak ditemukan",
      );
    if (application.status === input.decision)
      return { id, status: application.status };
    if (application.status !== "PENDING")
      throw new ApiError(
        409,
        "APPLICATION_ALREADY_REVIEWED",
        "Permohonan sudah diputuskan",
      );
    if (input.decision === "APPROVED") {
      const organizationId = z.uuid().parse(input.organizationId);
      const [organization] = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, organizationId));
      if (!organization)
        throw new ApiError(
          404,
          "ORGANIZATION_NOT_FOUND",
          "Organisasi tidak ditemukan",
        );
      await tx
        .insert(assessorProfiles)
        .values({
          userId: application.userId,
          employeeId: application.employeeId,
          institution: application.institution,
          programKeahlian: application.programKeahlian,
        });
      await tx
        .update(users)
        .set({
          role: "ASSESSOR",
          accessStatus: "ACTIVE",
          organizationId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, application.userId));
    } else
      await tx
        .update(users)
        .set({ accessStatus: "REJECTED", updatedAt: new Date() })
        .where(eq(users.id, application.userId));
    await tx
      .update(assessorApplications)
      .set({
        status: input.decision,
        reviewedBy,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assessorApplications.id, id));
    return { id, status: input.decision };
  });
}
