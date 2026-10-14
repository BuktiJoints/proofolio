import { and, desc, eq } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { rubrics } from "@/server/db/schema";
import { createVersion, rubricInput } from "@/server/domain/rubrics";
import { ok, route } from "@/server/http";

export const GET = () => route(async () => { const user = await currentUser(); const condition = user.role === "STUDENT" ? and(eq(rubrics.organizationId, user.organizationId), eq(rubrics.status, "PUBLISHED")) : eq(rubrics.organizationId, user.organizationId); return ok(await db.select().from(rubrics).where(condition).orderBy(desc(rubrics.updatedAt))); });
export const POST = (request: Request) => route(async () => {
  const user = await currentUser(["ASSESSOR"]); const body = rubricInput.parse(await request.json());
  const rubric = await db.transaction(async (tx) => { const [created] = await tx.insert(rubrics).values({ organizationId: user.organizationId, title: body.title, description: body.description, createdBy: user.id }).returning(); return created; });
  const version = await createVersion(rubric.id, user.id, body); return ok({ ...rubric, version }, { status: 201 });
});
