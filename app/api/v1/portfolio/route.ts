import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  evidenceShares,
  rubricVersions,
  submissions,
} from "@/server/db/schema";
import { ok, route } from "@/server/http";
export const GET = () =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const rows = await db
      .select({ submission: submissions, rubric: rubricVersions })
      .from(submissions)
      .innerJoin(
        rubricVersions,
        eq(rubricVersions.id, submissions.rubricVersionId),
      )
      .where(
        and(
          eq(submissions.studentId, user.id),
          eq(submissions.status, "COMPLETED"),
          eq(submissions.portfolioIncluded, true),
          eq(submissions.organizationId, user.organizationId),
        ),
      )
      .orderBy(desc(submissions.completedAt));
    const shares = await db
      .select({
        id: evidenceShares.id,
        submissionId: evidenceShares.submissionId,
        expiresAt: evidenceShares.expiresAt,
        revokedAt: evidenceShares.revokedAt,
        createdAt: evidenceShares.createdAt,
      })
      .from(evidenceShares)
      .where(eq(evidenceShares.createdBy, user.id));
    return ok(
      rows.map((row) => ({
        ...row,
        shares: shares.filter((s) => s.submissionId === row.submission.id),
      })),
    );
  });
