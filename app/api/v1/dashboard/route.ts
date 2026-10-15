import { and, desc, eq, sql } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  rubrics,
  rubricVersions,
  submissions,
  users,
} from "@/server/db/schema";
import { ok, route } from "@/server/http";
export const GET = () =>
  route(async () => {
    const user = await currentUser();
    const conditions = [eq(submissions.organizationId, user.organizationId)];
    if (user.role === "STUDENT")
      conditions.push(eq(submissions.studentId, user.id));
    const where = and(...conditions);
    const [counts, recent, [statistics], [modules]] = await Promise.all([
      db
        .select({
          status: submissions.status,
          count: sql<number>`count(*)::int`,
        })
        .from(submissions)
        .where(where)
        .groupBy(submissions.status),
      db
        .select({
          id: submissions.id,
          status: submissions.status,
          rubricVersionId: submissions.rubricVersionId,
          rubricTitle: rubricVersions.title,
          originalFilename: submissions.originalFilename,
          createdAt: submissions.createdAt,
          completedAt: submissions.completedAt,
          normalizedScore: submissions.normalizedScore,
          durationMs: submissions.durationMs,
          studentId: submissions.studentId,
          studentName: users.name,
        })
        .from(submissions)
        .innerJoin(
          rubricVersions,
          eq(rubricVersions.id, submissions.rubricVersionId),
        )
        .innerJoin(users, eq(users.id, submissions.studentId))
        .where(where)
        .orderBy(desc(submissions.createdAt))
        .limit(5),
      db
        .select({
          averageScore: sql<
            string | null
          >`round(avg(${submissions.normalizedScore}) filter (where ${submissions.status}='COMPLETED'),2)`,
          completedThisMonth: sql<number>`count(*) filter (where ${submissions.status}='COMPLETED' and ${submissions.completedAt} >= date_trunc('month', now()))::int`,
        })
        .from(submissions)
        .where(where),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(rubrics)
        .where(
          and(
            eq(rubrics.organizationId, user.organizationId),
            eq(rubrics.status, "PUBLISHED"),
          ),
        ),
    ]);
    return ok({
      counts: Object.fromEntries(counts.map((x) => [x.status, x.count])),
      recent,
      statistics: { ...statistics, activeRubrics: modules.count },
    });
  });
