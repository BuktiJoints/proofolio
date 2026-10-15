import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import {
  assessmentReviews,
  portfolioShares,
  rubricVersions,
  studentProfiles,
  submissions,
  users,
} from "@/server/db/schema";
import { hashToken } from "@/server/domain/shares";
import { ApiError } from "@/server/http";
export async function publicPortfolio(token: string) {
  const [share] = await db
    .select()
    .from(portfolioShares)
    .where(
      and(
        eq(portfolioShares.tokenHash, hashToken(token)),
        isNull(portfolioShares.revokedAt),
        gt(portfolioShares.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!share)
    throw new ApiError(
      404,
      "SHARE_NOT_FOUND",
      "Tautan tidak ditemukan atau sudah kedaluwarsa",
    );
  const [student] = await db
    .select({
      name: users.name,
      image: users.image,
      organizationId: users.organizationId,
      schoolName: studentProfiles.schoolName,
      programKeahlian: studentProfiles.programKeahlian,
    })
    .from(users)
    .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
    .where(eq(users.id, share.userId))
    .limit(1);
  if (!student)
    throw new ApiError(404, "SHARE_NOT_FOUND", "Portofolio tidak ditemukan");
  const items = await db
    .select({
      id: submissions.id,
      title: rubricVersions.title,
      description: rubricVersions.description,
      score: submissions.normalizedScore,
      completedAt: submissions.completedAt,
      feedback: assessmentReviews.feedback,
    })
    .from(submissions)
    .innerJoin(
      rubricVersions,
      eq(rubricVersions.id, submissions.rubricVersionId),
    )
    .innerJoin(
      assessmentReviews,
      eq(assessmentReviews.submissionId, submissions.id),
    )
    .where(
      and(
        eq(submissions.studentId, share.userId),
        eq(submissions.organizationId, student.organizationId),
        eq(submissions.status, "COMPLETED"),
        eq(submissions.portfolioIncluded, true),
      ),
    )
    .orderBy(desc(submissions.completedAt));
  return {
    student: {
      name: student.name,
      image: student.image,
      schoolName: student.schoolName,
      programKeahlian: student.programKeahlian,
    },
    items,
    expiresAt: share.expiresAt,
  };
}
