import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { organizations, rubricCriteria, rubrics, rubricVersions, users } from "@/server/db/schema";
import { env } from "@/server/env";
import { ensureBucket } from "@/server/integrations/storage";

const e = env();
const org = await db.insert(organizations).values({ name: "SMK Demo BuktiPraktik", slug: e.DEFAULT_ORGANIZATION_SLUG }).onConflictDoUpdate({ target: organizations.slug, set: { name: "SMK Demo BuktiPraktik", updatedAt: new Date() } }).returning().then((r) => r[0]);
const email = process.env.SEED_ASSESSOR_EMAIL ?? "asesor@bukti.local"; const password = process.env.SEED_ASSESSOR_PASSWORD ?? "DemoAsesor123!"; const name = process.env.SEED_ASSESSOR_NAME ?? "Asesor Demo";
let [assessor] = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (!assessor) { await auth.api.signUpEmail({ body: { email, password, name } }); [assessor] = await db.select().from(users).where(eq(users.email, email)).limit(1); }
await db.update(users).set({ role: "ASSESSOR", organizationId: org.id, updatedAt: new Date() }).where(eq(users.id, assessor.id));
const [existing] = await db.select().from(rubrics).where(eq(rubrics.title, "Praktik Keselamatan Kerja Dasar (K3)")).limit(1);
if (!existing) {
  const [rubric] = await db.insert(rubrics).values({ organizationId: org.id, title: "Praktik Keselamatan Kerja Dasar (K3)", description: "Rubrik demo untuk menilai penerapan prosedur K3.", status: "PUBLISHED", createdBy: assessor.id }).returning();
  const [version] = await db.insert(rubricVersions).values({ rubricId: rubric.id, version: 1, title: rubric.title, description: rubric.description, publishedAt: new Date(), createdBy: assessor.id }).returning();
  await db.insert(rubricCriteria).values([
    { rubricVersionId: version.id, code: "APD", title: "Menggunakan APD", description: "Siswa menggunakan alat pelindung diri yang sesuai sebelum praktik.", order: 1, required: true, maxScore: 30 },
    { rubricVersionId: version.id, code: "AREA", title: "Memeriksa area kerja", description: "Siswa memastikan area kerja aman dan rapi.", order: 2, required: true, maxScore: 30 },
    { rubricVersionId: version.id, code: "PROSEDUR", title: "Mengikuti prosedur", description: "Siswa menjalankan langkah kerja secara urut dan aman.", order: 3, required: true, maxScore: 40 },
  ]);
  await db.update(rubrics).set({ activeVersionId: version.id }).where(eq(rubrics.id, rubric.id));
}
await ensureBucket();
console.log(JSON.stringify({ seeded: true, organization: org.slug, assessor: email }));
