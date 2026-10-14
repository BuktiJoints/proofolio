import { and, desc, eq, sql } from "drizzle-orm";
import { currentUser } from "@/server/auth";
import { db } from "@/server/db";
import { submissions } from "@/server/db/schema";
import { ok, route } from "@/server/http";
export const GET = () => route(async () => { const user = await currentUser(); const conditions = [eq(submissions.organizationId, user.organizationId)]; if (user.role === "STUDENT") conditions.push(eq(submissions.studentId, user.id)); const where = and(...conditions); const [counts, recent] = await Promise.all([db.select({ status: submissions.status, count: sql<number>`count(*)::int` }).from(submissions).where(where).groupBy(submissions.status), db.select().from(submissions).where(where).orderBy(desc(submissions.createdAt)).limit(5)]); return ok({ counts: Object.fromEntries(counts.map((x) => [x.status, x.count])), recent }); });
