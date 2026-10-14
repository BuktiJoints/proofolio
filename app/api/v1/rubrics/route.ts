import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics, rubricVersions, rubricCriteria } from "@/server/db/schema";
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
        .select()
        .from(rubrics)
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
          createdBy: user.id,
        })
        .returning();
      await tx
        .insert(rubricCriteria)
        .values(
          body.criteria.map((criterion) => ({
            ...criterion,
            rubricVersionId: version.id,
          })),
        );
      return { ...created, version };
    });
    return ok(rubric, { status: 201 });
  });
