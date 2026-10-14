import { and, asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { rubricCriteria, rubrics, rubricVersions } from "@/server/db/schema";
import { ApiError } from "@/server/http";

export const criterionInput = z.object({
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(2000),
  order: z.number().int().nonnegative(),
  required: z.boolean().default(true),
  maxScore: z.number().int().min(1).max(100),
});
export const rubricInput = z
  .object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(4000).nullable().optional(),
    criteria: z.array(criterionInput).min(1).max(30),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.criteria.map((x) => x.code)).size !== v.criteria.length)
      ctx.addIssue({ code: "custom", message: "Kode kriteria harus unik" });
    if (new Set(v.criteria.map((x) => x.order)).size !== v.criteria.length)
      ctx.addIssue({ code: "custom", message: "Urutan kriteria harus unik" });
  });

export async function rubricDetail(id: string, organizationId: string) {
  const [rubric] = await db
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.organizationId, organizationId)))
    .limit(1);
  if (!rubric)
    throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
  const versions = await db
    .select()
    .from(rubricVersions)
    .where(eq(rubricVersions.rubricId, id))
    .orderBy(asc(rubricVersions.version));
  const detailed = await Promise.all(
    versions.map(async (version) => ({
      ...version,
      criteria: await db
        .select()
        .from(rubricCriteria)
        .where(eq(rubricCriteria.rubricVersionId, version.id))
        .orderBy(asc(rubricCriteria.order)),
    })),
  );
  return { ...rubric, versions: detailed };
}
export async function createVersion(
  rubricId: string,
  userId: string,
  values?: z.infer<typeof rubricInput>,
) {
  return db.transaction(async (tx) => {
    await tx
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, rubricId))
      .for("update");
    const [current] = await tx
      .select({ n: max(rubricVersions.version) })
      .from(rubricVersions)
      .where(eq(rubricVersions.rubricId, rubricId));
    let source = values;
    if (!source) {
      const [previous] = await tx
        .select()
        .from(rubricVersions)
        .where(eq(rubricVersions.rubricId, rubricId))
        .orderBy(desc(rubricVersions.version))
        .limit(1);
      if (!previous)
        throw new ApiError(
          404,
          "VERSION_NOT_FOUND",
          "Versi rubrik tidak ditemukan",
        );
      const criteria = await tx
        .select()
        .from(rubricCriteria)
        .where(eq(rubricCriteria.rubricVersionId, previous.id))
        .orderBy(asc(rubricCriteria.order));
      source = rubricInput.parse({
        title: previous.title,
        description: previous.description,
        criteria,
      });
    }
    const [version] = await tx
      .insert(rubricVersions)
      .values({
        rubricId,
        version: (current.n ?? 0) + 1,
        title: source.title,
        description: source.description,
        createdBy: userId,
      })
      .returning();
    await tx.insert(rubricCriteria).values(
      source.criteria.map((c) => ({
        rubricVersionId: version.id,
        code: c.code,
        title: c.title,
        description: c.description,
        order: c.order,
        required: c.required,
        maxScore: c.maxScore,
      })),
    );
    await tx
      .update(rubrics)
      .set({
        status: "DRAFT",
        activeVersionId: null,
        title: source.title,
        description: source.description,
        updatedAt: new Date(),
      })
      .where(eq(rubrics.id, rubricId));
    return version;
  });
}
