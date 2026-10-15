import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../../server/db";
import {
  organizations,
  users,
  rubrics,
  rubricVersions,
  rubricCriteria,
} from "../../server/db/schema";
import { seedDemoRubrics } from "../../server/seeds/rubrics";

test("rubric seeding is atomic, repeatable, tenant-scoped and preserves published versions", async () => {
  if (
    !process.env.DATABASE_URL ||
    !["localhost", "127.0.0.1"].includes(
      new URL(process.env.DATABASE_URL).hostname,
    )
  )
    throw new Error("Seed tests require a local database");
  const orgIds = [randomUUID(), randomUUID()];
  const userIds = [randomUUID(), randomUUID()];
  try {
    await db.insert(organizations).values(
      orgIds.map((id) => ({
        id,
        name: "Seed regression fixture",
        slug: `seed-test-${id}`,
      })),
    );
    await db.insert(users).values(
      userIds.map((id, index) => ({
        id,
        name: "Seed regression assessor",
        email: `seed-${id}@example.test`,
        role: "ASSESSOR" as const,
        organizationId: orgIds[index],
      })),
    );
    const seeded = await seedDemoRubrics(orgIds[0], userIds[0]);
    expect(seeded.filter((rubric) => rubric.created)).toHaveLength(2);
    const [teaching] = await db
      .select()
      .from(rubrics)
      .where(
        and(
          eq(rubrics.organizationId, orgIds[0]),
          eq(rubrics.title, "Keterampilan Mengajar (Microteaching)"),
        ),
      );
    expect(teaching.status).toBe("PUBLISHED");
    expect(teaching.activeVersionId).not.toBeNull();
    const before = await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, teaching.activeVersionId!))
      .orderBy(rubricCriteria.order);
    expect(before).toHaveLength(6);
    expect(before.reduce((sum, criterion) => sum + criterion.maxScore, 0)).toBe(
      100,
    );
    const results = await Promise.all([
      seedDemoRubrics(orgIds[0], userIds[0]),
      seedDemoRubrics(orgIds[0], userIds[0]),
    ]);
    expect(results.flat().some((rubric) => rubric.created)).toBe(false);
    const after = await db
      .select()
      .from(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, teaching.activeVersionId!))
      .orderBy(rubricCriteria.order);
    expect(after).toEqual(before);
    const versions = await db
      .select()
      .from(rubricVersions)
      .where(eq(rubricVersions.rubricId, teaching.id));
    expect(versions).toHaveLength(1);
    const other = await seedDemoRubrics(orgIds[1], userIds[1]);
    expect(other.filter((rubric) => rubric.created)).toHaveLength(2);
    await db
      .insert(rubricVersions)
      .values({
        rubricId: teaching.id,
        version: 2,
        title: "Judul revisi asesor",
        description: "Draft manual",
        createdBy: userIds[0],
      });
    await db
      .update(rubrics)
      .set({
        title: "Judul revisi asesor",
        status: "DRAFT",
        activeVersionId: null,
      })
      .where(eq(rubrics.id, teaching.id));
    const renamed = await seedDemoRubrics(orgIds[0], userIds[0]);
    expect(renamed.some((rubric) => rubric.created)).toBe(false);
    const [edited] = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, teaching.id));
    expect(edited.title).toBe("Judul revisi asesor");
    expect(edited.status).toBe("DRAFT");
    await db
      .update(rubrics)
      .set({ status: "ARCHIVED", activeVersionId: null })
      .where(eq(rubrics.id, teaching.id));
    await seedDemoRubrics(orgIds[0], userIds[0]);
    const [preserved] = await db
      .select()
      .from(rubrics)
      .where(eq(rubrics.id, teaching.id));
    expect(preserved.status).toBe("ARCHIVED");
    expect(preserved.activeVersionId).toBeNull();
  } finally {
    await db.delete(rubrics).where(inArray(rubrics.organizationId, orgIds));
    await db.delete(users).where(inArray(users.id, userIds));
    await db.delete(organizations).where(inArray(organizations.id, orgIds));
    await pool.end();
  }
});
