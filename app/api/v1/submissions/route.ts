import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  analysisJobs,
  rubrics,
  rubricVersions,
  studentProfiles,
  submissionEvents,
  submissions,
} from "@/server/db/schema";
import { deleteVideo, putVideo } from "@/server/integrations/storage";
import { ApiError, ok, pageParams, paged, route } from "@/server/http";
import { cleanupUpload, parseVideoUpload } from "@/server/uploads";

export const POST = (request: Request) =>
  route(async () => {
    const user = await currentUser(["STUDENT"]);
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, user.id))
      .limit(1);
    if (!profile?.schoolName || !profile.programKeahlian)
      throw new ApiError(
        409,
        "PROFILE_INCOMPLETE",
        "Lengkapi profil sebelum mengunggah video",
      );
    const upload = await parseVideoUpload(request);
    const objectKey = `${user.organizationId}/${user.id}/${crypto.randomUUID()}`;
    let uploaded = false;
    try {
      const [version] = await db
        .select({ id: rubricVersions.id })
        .from(rubricVersions)
        .innerJoin(rubrics, eq(rubrics.id, rubricVersions.rubricId))
        .where(
          and(
            eq(rubricVersions.id, upload.rubricVersionId),
            eq(rubrics.organizationId, user.organizationId),
            eq(rubrics.status, "PUBLISHED"),
            eq(rubrics.activeVersionId, upload.rubricVersionId),
          ),
        )
        .limit(1);
      if (!version)
        throw new ApiError(
          400,
          "RUBRIC_NOT_ACTIVE",
          "Pilih versi rubrik yang sedang aktif",
        );
      await putVideo(objectKey, upload.path, upload.mime);
      uploaded = true;
      const submission = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(submissions)
          .values({
            organizationId: user.organizationId,
            studentId: user.id,
            rubricVersionId: upload.rubricVersionId,
            originalFilename: upload.filename,
            objectKey,
            mimeType: upload.mime,
            sizeBytes: upload.size,
            durationMs: upload.durationMs,
            sha256: upload.sha256,
          })
          .returning();
        await tx.insert(analysisJobs).values({ submissionId: created.id });
        await tx
          .insert(submissionEvents)
          .values({
            submissionId: created.id,
            actorId: user.id,
            type: "SUBMITTED",
          });
        return created;
      });
      return ok(submission, { status: 202 });
    } catch (error) {
      if (uploaded) await deleteVideo(objectKey).catch(() => undefined);
      throw error;
    } finally {
      await cleanupUpload(upload);
    }
  });

export const GET = (request: Request) =>
  route(async () => {
    const user = await currentUser();
    const { page, limit, offset } = pageParams(request.url);
    const q = new URL(request.url).searchParams;
    const rawStatus = q.get("status");
    const status =
      rawStatus === null
        ? null
        : z.enum(submissions.status.enumValues).parse(rawStatus);
    const conditions = [eq(submissions.organizationId, user.organizationId)];
    if (user.role === "STUDENT")
      conditions.push(eq(submissions.studentId, user.id));
    if (status)
      conditions.push(
        eq(
          submissions.status,
          status as (typeof submissions.status.enumValues)[number],
        ),
      );
    const where = and(...conditions);
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(submissions)
        .where(where)
        .orderBy(desc(submissions.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(submissions)
        .where(where),
    ]);
    return paged(rows, page, limit, totalRows[0]?.count ?? 0);
  });
