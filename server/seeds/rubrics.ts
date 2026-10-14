import { and, eq, or } from "drizzle-orm";
import { db } from "@/server/db";
import {
  organizations,
  rubrics,
  rubricVersions,
  rubricCriteria,
} from "@/server/db/schema";
import { rubricInput } from "@/server/domain/rubrics";
import { demoRubrics } from "./demo-rubrics";

// Lock the organization so concurrent seed runs cannot create duplicate demo aggregates.
// Existing versions, edits and archive decisions are preserved on rerun.
export async function seedDemoRubrics(
  organizationId: string,
  assessorId: string,
) {
  return db.transaction(async (tx) => {
    const [organization] = await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .for("update");
    if (!organization) throw new Error("Seed organization not found");
    const results: { id: string; title: string; created: boolean }[] = [];
    for (const definition of demoRubrics) {
      const input = rubricInput.parse(definition);
      const [existing] = await tx
        .select({ id: rubrics.id, title: rubrics.title })
        .from(rubrics)
        .innerJoin(
          rubricVersions,
          and(
            eq(rubricVersions.rubricId, rubrics.id),
            eq(rubricVersions.version, 1),
          ),
        )
        .where(
          and(
            eq(rubrics.organizationId, organizationId),
            or(
              eq(rubrics.title, input.title),
              eq(rubricVersions.title, input.title),
            ),
          ),
        )
        .limit(1);
      if (existing) {
        results.push({ ...existing, created: false });
        continue;
      }
      const [rubric] = await tx
        .insert(rubrics)
        .values({
          organizationId,
          title: input.title,
          description: input.description,
          status: "DRAFT",
          createdBy: assessorId,
        })
        .returning();
      const [version] = await tx
        .insert(rubricVersions)
        .values({
          rubricId: rubric.id,
          version: 1,
          title: input.title,
          description: input.description,
          publishedAt: new Date(),
          createdBy: assessorId,
        })
        .returning();
      await tx.insert(rubricCriteria).values(
        input.criteria.map((criterion) => ({
          ...criterion,
          rubricVersionId: version.id,
        })),
      );
      await tx
        .update(rubrics)
        .set({
          status: "PUBLISHED",
          activeVersionId: version.id,
          updatedAt: new Date(),
        })
        .where(eq(rubrics.id, rubric.id));
      results.push({ id: rubric.id, title: rubric.title, created: true });
    }
    return results;
  });
}
