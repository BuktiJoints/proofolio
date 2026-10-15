import { and, desc, eq, sql } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import {
  organizations,
  rubrics,
  rubricVersions,
  rubricCriteria,
} from "@/server/db/schema";
import { rubricInput } from "@/server/domain/rubrics";
import { ok, route } from "@/server/http";

export const GET = () =>
  route(async () => {
    const user = await currentUser();
    const condition =
      user.role === "STUDENT"
        ? and(
            eq(rubrics.organizationId, user.organizationId),
            eq(rubrics.status, "PUBLISHED"),
          )
        : eq(rubrics.organizationId, user.organizationId);
    return ok(
      await db
        .select({
          id: rubrics.id,
          organizationId: rubrics.organizationId,
          title: rubrics.title,
          description: rubrics.description,
          programKeahlian: rubrics.programKeahlian,
          partnerName: rubrics.partnerName,
          requirements: rubrics.requirements,
          followed: sql<boolean>`exists(select 1 from submissions s join rubric_versions v on v.id=s.rubric_version_id where v.rubric_id=${rubrics.id} and s.student_id=${user.id} and s.organization_id=${user.organizationId})`,
          criterionCount: sql<number>`(select count(*)::int from rubric_criteria where rubric_version_id = coalesce(${rubrics.activeVersionId}, (select id from rubric_versions where rubric_id = ${rubrics.id} order by version desc limit 1)))`,
          status: rubrics.status,
          activeVersionId: rubrics.activeVersionId,
          createdBy: rubrics.createdBy,
          createdAt: rubrics.createdAt,
          updatedAt: rubrics.updatedAt,
          partner: { id: organizations.id, name: organizations.name },
        })
        .from(rubrics)
        .innerJoin(organizations, eq(organizations.id, rubrics.organizationId))
        .where(condition)
        .orderBy(desc(rubrics.updatedAt)),
    );
  });
export const POST = (request: Request) =>
  route(async () => {
    const user = await currentUser(["ASSESSOR"]);
    const body = rubricInput.parse(await request.json());
    const rubric = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(rubrics)
        .values({
          organizationId: user.organizationId,
          title: body.title,
          description: body.description,
          programKeahlian: body.programKeahlian,
          partnerName: body.partnerName,
          requirements: body.requirements,
          createdBy: user.id,
        })
        .returning();
      const [version] = await tx
        .insert(rubricVersions)
        .values({
          rubricId: created.id,
          version: 1,
          title: body.title,
          description: body.description,
          programKeahlian: body.programKeahlian,
          partnerName: body.partnerName,
          requirements: body.requirements,
          createdBy: user.id,
        })
        .returning();
      await tx.insert(rubricCriteria).values(
        body.criteria.map((criterion) => ({
          ...criterion,
          rubricVersionId: version.id,
        })),
      );
      return { ...created, version };
    });
    return ok(rubric, { status: 201 });
  });
