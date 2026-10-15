import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics, rubricVersions, rubricCriteria } from "@/server/db/schema";
import { rubricInput } from "@/server/domain/rubrics";
import { uuidParam, ApiError, ok, route } from "@/server/http";
export const POST = (
  _: Request,
  ctx: RouteContext<"/api/v1/rubrics/[id]/publish">,
) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const { id } = await ctx.params;
    uuidParam(id);
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
      if (rubric.status === "PUBLISHED") return rubric;
      if (rubric.status !== "DRAFT")
        throw new ApiError(
          409,
          "INVALID_RUBRIC_STATE",
          "Buat versi draft sebelum menerbitkan rubrik",
        );
      const [version] = await tx
        .select()
        .from(rubricVersions)
        .where(eq(rubricVersions.rubricId, id))
        .orderBy(desc(rubricVersions.version))
        .limit(1);
      if (!version || version.publishedAt)
        throw new ApiError(409, "INVALID_RUBRIC", "Versi draft tidak tersedia");
      const criteria = await tx
        .select()
        .from(rubricCriteria)
        .where(eq(rubricCriteria.rubricVersionId, version.id));
      if (
        !rubricInput.safeParse({
          title: version.title,
          description: version.description,
          criteria,
        }).success
      )
        throw new ApiError(
          409,
          "INVALID_RUBRIC",
          "Lengkapi kriteria rubrik sebelum menerbitkan",
        );
      await tx
        .update(rubricVersions)
        .set({ publishedAt: new Date() })
        .where(eq(rubricVersions.id, version.id));
      const [updated] = await tx
        .update(rubrics)
        .set({
          status: "PUBLISHED",
          activeVersionId: version.id,
          updatedAt: new Date(),
        })
        .where(eq(rubrics.id, id))
        .returning();
      return updated;
    });
    return ok(result);
  });
