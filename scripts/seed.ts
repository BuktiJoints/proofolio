import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { organizations, users } from "@/server/db/schema";
import { seedDemoRubrics } from "@/server/seeds/rubrics";
import { env } from "@/server/env";
import { ensureBucket } from "@/server/integrations/storage";

const e = env();
const org = await db
  .insert(organizations)
  .values({ name: "SMK Demo BuktiPraktik", slug: e.DEFAULT_ORGANIZATION_SLUG })
  .onConflictDoUpdate({
    target: organizations.slug,
    set: { name: "SMK Demo BuktiPraktik", updatedAt: new Date() },
  })
  .returning()
  .then((r) => r[0]);
const email = process.env.SEED_ASSESSOR_EMAIL ?? "asesor@bukti.local";
const password = process.env.SEED_ASSESSOR_PASSWORD ?? "DemoAsesor123!";
const name = process.env.SEED_ASSESSOR_NAME ?? "Asesor Demo";
let [assessor] = await db
  .select()
  .from(users)
  .where(eq(users.email, email))
  .limit(1);
if (!assessor) {
  await auth.api.signUpEmail({ body: { email, password, name } });
  [assessor] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
}
await db
  .update(users)
  .set({ role: "ASSESSOR", organizationId: org.id, updatedAt: new Date() })
  .where(eq(users.id, assessor.id));
const seededRubrics = await seedDemoRubrics(org.id, assessor.id);
await ensureBucket();
console.log(
  JSON.stringify({
    seeded: true,
    organization: org.slug,
    assessor: email,
    rubrics: seededRubrics,
  }),
);
