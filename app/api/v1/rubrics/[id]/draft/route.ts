import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubricCriteria, rubrics, rubricVersions } from "@/server/db/schema";
import { rubricInput } from "@/server/domain/rubrics";
import { uuidParam, ApiError, ok, route } from "@/server/http";

export const PUT = (
  request: Request,
  ctx: RouteContext<"/api/v1/rubrics/[id]/draft">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
    const body = rubricInput.parse(await request.json());
    const result = await db.transaction(async (tx) => {
      const [rubric] = await tx
        .select()
        .from(rubrics)
        .where(
          and(
            eq(rubrics.id, id),
            eq(rubrics.organizationId, user.organizationId),
          ),
        )
        .limit(1)
        .for("update");
      if (!rubric)
        throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
      if (rubric.status !== "DRAFT")
        throw new ApiError(
          409,
          "PUBLISHED_RUBRIC_IMMUTABLE",
          "Buat versi baru untuk mengubah rubrik yang telah diterbitkan",
        );
      const [version] = await tx
        .select()
        .from(rubricVersions)
        .where(eq(rubricVersions.rubricId, id))
        .orderBy(desc(rubricVersions.version))
        .limit(1);
      if (!version || version.publishedAt)
        throw new ApiError(
          409,
          "PUBLISHED_RUBRIC_IMMUTABLE",
          "Tidak ada versi draft yang dapat diubah",
        );
      await tx
        .update(rubrics)
        .set({
          title: body.title,
          description: body.description,
          programKeahlian: body.programKeahlian,
          partnerName: body.partnerName,
          requirements: body.requirements,
          updatedAt: new Date(),
        })
        .where(eq(rubrics.id, id));
      await tx
        .update(rubricVersions)
        .set({
          title: body.title,
          description: body.description,
          programKeahlian: body.programKeahlian,
          partnerName: body.partnerName,
          requirements: body.requirements,
          updatedAt: new Date(),
        })
        .where(eq(rubricVersions.id, version.id));
      await tx
        .delete(rubricCriteria)
        .where(eq(rubricCriteria.rubricVersionId, version.id));
      await tx
        .insert(rubricCriteria)
        .values(
          body.criteria.map((c) => ({ ...c, rubricVersionId: version.id })),
        );
      return { ...rubric, ...body, versionId: version.id };
    });
    return ok(result);
  });
