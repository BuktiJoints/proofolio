import {
  request as playwrightRequest,
  type APIRequestContext,
} from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
export const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
export async function actors() {
  if (!process.env.DATABASE_URL || process.env.FAKE_AI !== "true")
    throw new Error(
      "Tests require a local DATABASE_URL and FAKE_AI=true. Never run against production.",
    );
  const url = new URL(process.env.DATABASE_URL);
  if (!["localhost", "127.0.0.1"].includes(url.hostname))
    throw new Error("Tests only support a local database.");
  if (!["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname))
    throw new Error("Tests only support a local web server.");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const run = randomUUID();
  const password = `Test-${randomUUID()}!`;
  const orgId = randomUUID();
  const otherOrgId = randomUUID();
  await pool.query(
    "insert into organizations (id,name,slug) values ($1,$2,$3),($4,$5,$6)",
    [
      orgId,
      "Frontend test",
      `fe-${run}`,
      otherOrgId,
      "Other test",
      `other-${run}`,
    ],
  );
  const userIds: string[] = [];
  const contexts: APIRequestContext[] = [];
  async function account(
    label: string,
    role: "STUDENT" | "ASSESSOR",
    organizationId = orgId,
  ) {
    const email = `${label}-${run}@example.test`;
    const context = await playwrightRequest.newContext({ baseURL });
    contexts.push(context);
    const response = await context.post("/api/auth/sign-up/email", {
      data: { name: `Test ${label}`, email, password },
    });
    if (!response.ok())
      throw new Error(`Test signup failed (${response.status()})`);
    const payload = await response.json();
    const id = payload.user.id as string;
    userIds.push(id);
    await pool.query(
      "update users set role=$1, organization_id=$2 where id=$3",
      [role, organizationId, id],
    );
    return { id, email, context };
  }
  async function cleanup() {
    // Delete only this run's fixtures. Submission deletes cascade jobs, evidence, reviews and shares.
    await pool.query(
      "delete from submissions where organization_id = any($1::uuid[])",
      [[orgId, otherOrgId]],
    );
    await pool.query(
      "delete from rubrics where organization_id = any($1::uuid[])",
      [[orgId, otherOrgId]],
    );
    await pool.query("delete from users where id = any($1::text[])", [userIds]);
    await pool.query("delete from organizations where id = any($1::uuid[])", [
      [orgId, otherOrgId],
    ]);
    await Promise.all(contexts.map((context) => context.dispose()));
    await pool.end();
  }
  try {
    const student = await account("student", "STUDENT");
    const assessor = await account("assessor", "ASSESSOR");
    const secondAssessor = await account("second", "ASSESSOR");
    const outsider = await account("outsider", "STUDENT", otherOrgId);
    return {
      pool,
      password,
      orgId,
      run,
      student,
      assessor,
      secondAssessor,
      outsider,
      trackUser: (id: string) => userIds.push(id),
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
export function pdfFixture() {
  const content =
    "BT /F1 12 Tf 40 740 Td (Rubric K3: safe working procedure, maximum score 100.) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let doc = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(Buffer.byteLength(doc));
    doc += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(doc);
  doc += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(doc);
}
