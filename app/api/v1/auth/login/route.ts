import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { assessorProfiles, studentProfiles, users } from "@/server/db/schema";
import { ApiError, route } from "@/server/http";
import { phoneInput } from "@/server/domain/onboarding";
export const POST = (request: Request) =>
  route(async () => {
    const body = z
      .object({
        identifier: z.string().trim().min(1).max(254),
        password: z.string().min(1).max(128),
      })
      .parse(await request.json());
    let email = body.identifier;
    if (!z.email().safeParse(email).success) {
      const phone = phoneInput.safeParse(body.identifier);
      // A numeric NIP can resemble a phone number. Search both identities,
      // and require one unambiguous account rather than choosing by formatting.
      const phoneMatches = phone.success
        ? await db
            .select({ email: users.email })
            .from(studentProfiles)
            .innerJoin(users, eq(users.id, studentProfiles.userId))
            .where(eq(studentProfiles.phone, phone.data))
            .limit(2)
        : [];
      const employeeMatches = await db
        .select({ email: users.email })
        .from(assessorProfiles)
        .innerJoin(users, eq(users.id, assessorProfiles.userId))
        .where(eq(assessorProfiles.employeeId, body.identifier))
        .limit(2);
      const matches = [
        ...new Map(
          [...phoneMatches, ...employeeMatches].map((user) => [
            user.email,
            user,
          ]),
        ).values(),
      ];
      if (matches.length !== 1)
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "Email, identitas, atau kata sandi tidak sesuai",
        );
      email = matches[0].email;
    }
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    headers.set("content-type", "application/json");
    const result = await auth.handler(
      new Request(new URL("/api/auth/sign-in/email", request.url), {
        method: "POST",
        headers,
        body: JSON.stringify({ email, password: body.password }),
      }),
    );
    if (!result.ok)
      throw new ApiError(
        result.status === 429 ? 429 : 401,
        "INVALID_CREDENTIALS",
        "Email, identitas, atau kata sandi tidak sesuai",
      );
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of result.headers.getSetCookie())
      responseHeaders.append("Set-Cookie", cookie);
    return Response.json(
      { data: { signedIn: true } },
      { headers: responseHeaders },
    );
  });
