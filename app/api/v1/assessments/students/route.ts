import { z } from "zod";
import { and, eq, ilike, or, sql, asc } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { studentProfiles, submissions, users } from "@/server/db/schema";
import { pageParams, route } from "@/server/http";
export const GET = (request: Request) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { page, limit, offset } = pageParams(request.url);
    const params = new URL(request.url).searchParams;
    const group = z
      .enum(["pending", "completed"])
      .parse(params.get("group") ?? "pending");
    const q = z
      .string()
      .trim()
      .max(120)
      .parse(params.get("q") ?? "");
    const program = z
      .string()
      .max(180)
      .parse(params.get("program") ?? "");
    const where = and(
      eq(submissions.organizationId, user.organizationId),
      group === "completed"
        ? eq(submissions.status, "COMPLETED")
        : sql`${submissions.status} != 'COMPLETED'`,
      q
        ? or(ilike(users.name, `%${q}%`), ilike(studentProfiles.nisn, `%${q}%`))
        : undefined,
      program ? eq(studentProfiles.programKeahlian, program) : undefined,
    );
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        nisn: studentProfiles.nisn,
        schoolName: studentProfiles.schoolName,
        programKeahlian: studentProfiles.programKeahlian,
        submissionCount: sql<number>`count(*)::int`,
      })
      .from(submissions)
      .innerJoin(users, eq(users.id, submissions.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(where)
      .groupBy(users.id, studentProfiles.id)
      .orderBy(asc(users.name))
      .limit(limit)
      .offset(offset);
    const [total] = await db
      .select({ count: sql<number>`count(distinct ${users.id})::int` })
      .from(submissions)
      .innerJoin(users, eq(users.id, submissions.studentId))
      .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(where);
    const programs = await db
      .selectDistinct({ program: studentProfiles.programKeahlian })
      .from(submissions)
      .innerJoin(
        studentProfiles,
        eq(studentProfiles.userId, submissions.studentId),
      )
      .where(eq(submissions.organizationId, user.organizationId));
    return Response.json(
      {
        data: rows,
        meta: {
          page,
          limit,
          total: total.count,
          programs: programs.map((p) => p.program).filter(Boolean),
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  });
