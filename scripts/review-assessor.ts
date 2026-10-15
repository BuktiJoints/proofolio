import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { db, pool } from "../server/db";
import { assessorApplications, users } from "../server/db/schema";
import { reviewAssessorApplication } from "../server/domain/onboarding";
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    list: { type: "boolean" },
    id: { type: "string" },
    organization: { type: "string" },
    reviewer: { type: "string" },
    reject: { type: "boolean" },
  },
});
try {
  if (values.list)
    console.table(
      await db
        .select({
          id: assessorApplications.id,
          name: users.name,
          employeeId: assessorApplications.employeeId,
          institution: assessorApplications.institution,
          status: assessorApplications.status,
        })
        .from(assessorApplications)
        .innerJoin(users, eq(users.id, assessorApplications.userId))
        .where(eq(assessorApplications.status, "PENDING")),
    );
  else if (!values.id || !values.reviewer)
    throw new Error(
      "Gunakan --list, atau --id UUID --organization UUID --reviewer nama-admin [--reject]",
    );
  else
    console.log(
      await reviewAssessorApplication({
        id: values.id,
        organizationId: values.organization,
        reviewedBy: values.reviewer,
        decision: values.reject ? "REJECTED" : "APPROVED",
      }),
    );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Permohonan gagal diproses",
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
