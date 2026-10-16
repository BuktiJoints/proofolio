import { and, asc, desc, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/server/db";
import { rubricCriteria, rubrics, rubricVersions } from "@/server/db/schema";
import { ApiError } from "@/server/http";

export const criterionInput = z.object({
  code: z.string().trim().min(1).max(40),
  title: z.string().trim().min(2).max(180),
  description: z.string().trim().min(2).max(8000),
  order: z.number().int().nonnegative(),
  required: z.boolean().default(true),
  maxScore: z.number().int().min(1).max(100),
});
export const rubricInput = z
  .object({
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(4000).nullable().optional(),
    programKeahlian: z.string().trim().min(2).max(180).nullable().optional(),
    partnerName: z.string().trim().min(2).max(180).nullable().optional(),
    requirements: z.string().trim().max(4000).nullable().optional(),
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
  values: z.infer<typeof rubricInput> | undefined,
  organizationId: string,
) {
  return db.transaction(async (tx) => {
    const [aggregate] = await tx
      .select()
      .from(rubrics)
      .where(
        and(
          eq(rubrics.id, rubricId),
          eq(rubrics.organizationId, organizationId),
        ),
      )
      .for("update");
    if (!aggregate)
      throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
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
        programKeahlian: previous.programKeahlian,
        partnerName: previous.partnerName,
        requirements: previous.requirements,
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
        programKeahlian: source.programKeahlian,
        partnerName: source.partnerName,
        requirements: source.requirements,
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
    if (!aggregate.activeVersionId)
      await tx
        .update(rubrics)
        .set({
          status: aggregate.status === "ARCHIVED" ? "ARCHIVED" : "DRAFT",
          title: source.title,
          description: source.description,
          programKeahlian: source.programKeahlian,
          partnerName: source.partnerName,
          requirements: source.requirements,
          updatedAt: new Date(),
        })
        .where(eq(rubrics.id, rubricId));
    return version;
  });
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function lockRubric(tx: Transaction, id: string, organizationId: string) {
  const [rubric] = await tx
    .select()
    .from(rubrics)
    .where(and(eq(rubrics.id, id), eq(rubrics.organizationId, organizationId)))
    .for("update");
  if (!rubric)
    throw new ApiError(404, "RUBRIC_NOT_FOUND", "Rubrik tidak ditemukan");
  return rubric;
}
export async function updateDraftVersion(
  id: string,
  organizationId: string,
  input: z.infer<typeof rubricInput>,
  versionId?: string,
) {
  return db.transaction(async (tx) => {
    const rubric = await lockRubric(tx, id, organizationId);
    const [version] = await tx
      .select()
      .from(rubricVersions)
      .where(
        and(
          eq(rubricVersions.rubricId, id),
          versionId ? eq(rubricVersions.id, versionId) : undefined,
        ),
      )
      .orderBy(desc(rubricVersions.version))
      .limit(1);
    if (!version)
      throw new ApiError(
        404,
        "VERSION_NOT_FOUND",
        "Versi rubrik tidak ditemukan",
      );
    if (version.publishedAt)
      throw new ApiError(
        409,
        "PUBLISHED_RUBRIC_IMMUTABLE",
        "Versi terbit tidak dapat diubah. Buat draf baru.",
      );
    const { criteria, ...metadata } = input;
    const [updated] = await tx
      .update(rubricVersions)
      .set({ ...metadata, updatedAt: new Date() })
      .where(eq(rubricVersions.id, version.id))
      .returning();
    await tx
      .delete(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, version.id));
    await tx
      .insert(rubricCriteria)
      .values(criteria.map((c) => ({ ...c, rubricVersionId: version.id })));
    const [latest] = await tx
      .select({ id: rubricVersions.id })
      .from(rubricVersions)
      .where(eq(rubricVersions.rubricId, id))
      .orderBy(desc(rubricVersions.version))
      .limit(1);
    if (!rubric.activeVersionId && latest.id === version.id)
      await tx
        .update(rubrics)
        .set({ ...metadata, updatedAt: new Date() })
        .where(eq(rubrics.id, id));
    return { ...updated, criteria };
  });
}
export async function publishRubricVersion(
  id: string,
  organizationId: string,
  versionId?: string,
) {
  return db.transaction(async (tx) => {
    const rubric = await lockRubric(tx, id, organizationId);
    const [version] = await tx
      .select()
      .from(rubricVersions)
      .where(
        and(
          eq(rubricVersions.rubricId, id),
          versionId ? eq(rubricVersions.id, versionId) : undefined,
        ),
      )
      .orderBy(desc(rubricVersions.version))
      .limit(1);
    if (!version)
      throw new ApiError(
        versionId ? 404 : 409,
        versionId ? "VERSION_NOT_FOUND" : "INVALID_RUBRIC",
        "Versi rubrik belum tersedia",
      );
    if (rubric.status === "PUBLISHED" && rubric.activeVersionId === version.id)
      return rubric;
    const criteria = await tx
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, version.id));
    if (!rubricInput.safeParse({ ...version, criteria }).success)
      throw new ApiError(
        409,
        "INVALID_RUBRIC",
        "Lengkapi kriteria rubrik sebelum menerbitkan",
      );
    if (!version.publishedAt)
      await tx
        .update(rubricVersions)
        .set({ publishedAt: new Date() })
        .where(eq(rubricVersions.id, version.id));
    const [updated] = await tx
      .update(rubrics)
      .set({
        status: "PUBLISHED",
        activeVersionId: version.id,
        title: version.title,
        description: version.description,
        programKeahlian: version.programKeahlian,
        partnerName: version.partnerName,
        requirements: version.requirements,
        updatedAt: new Date(),
      })
      .where(eq(rubrics.id, id))
      .returning();
    return updated;
  });
}
export async function deleteDraftVersion(
  id: string,
  organizationId: string,
  versionId: string,
) {
  return db.transaction(async (tx) => {
    const rubric = await lockRubric(tx, id, organizationId);
    const [version] = await tx
      .select()
      .from(rubricVersions)
      .where(
        and(eq(rubricVersions.rubricId, id), eq(rubricVersions.id, versionId)),
      );
    if (!version)
      throw new ApiError(
        404,
        "VERSION_NOT_FOUND",
        "Versi rubrik tidak ditemukan",
      );
    if (version.publishedAt || rubric.activeVersionId === version.id)
      throw new ApiError(
        409,
        "PUBLISHED_RUBRIC_IMMUTABLE",
        "Versi yang pernah terbit tidak dapat dihapus",
      );
    await tx
      .delete(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, version.id));
    await tx.delete(rubricVersions).where(eq(rubricVersions.id, version.id));
    if (!rubric.activeVersionId) {
      const [latest] = await tx
        .select()
        .from(rubricVersions)
        .where(eq(rubricVersions.rubricId, id))
        .orderBy(desc(rubricVersions.version))
        .limit(1);
      if (latest)
        await tx
          .update(rubrics)
          .set({
            title: latest.title,
            description: latest.description,
            programKeahlian: latest.programKeahlian,
            partnerName: latest.partnerName,
            requirements: latest.requirements,
            updatedAt: new Date(),
          })
          .where(eq(rubrics.id, id));
    }
    return { id: version.id, deleted: true };
  });
}
