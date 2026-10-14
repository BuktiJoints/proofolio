import { asc, eq } from "drizzle-orm";
import { db, pool } from "@/server/db";
import { analysisEvidence, analysisJobs, analysisRuns, rubricCriteria, submissionEvents, submissions } from "@/server/db/schema";
import { env } from "@/server/env";
import { analyzeVideo } from "@/server/integrations/gemini";

type Claimed = { id: string; submission_id: string; attempts: number };
export async function claimJob(workerId: string): Promise<Claimed | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<Claimed>(`select id, submission_id, attempts from analysis_jobs where status in ('PENDING','RETRY_SCHEDULED') and available_at <= now() and (locked_at is null or locked_at < now() - interval '10 minutes') order by available_at for update skip locked limit 1`);
    const job = result.rows[0];
    if (!job) { await client.query("commit"); return null; }
    await client.query(`update analysis_jobs set status='RUNNING', attempts=attempts+1, locked_at=now(), locked_by=$2, updated_at=now() where id=$1`, [job.id, workerId]);
    await client.query(`update submissions set status='ANALYZING', updated_at=now() where id=$1`, [job.submission_id]);
    await client.query("commit"); return { ...job, attempts: job.attempts + 1 };
  } catch (error) { await client.query("rollback"); throw error; } finally { client.release(); }
}

export async function processOne(workerId: string): Promise<boolean> {
  const job = await claimJob(workerId); if (!job) return false;
  const startedAt = new Date(); let runId: string | undefined;
  try {
    const [submission] = await db.select().from(submissions).where(eq(submissions.id, job.submission_id)).limit(1); if (!submission) throw new Error("Submission not found");
    const criteria = await db.select().from(rubricCriteria).where(eq(rubricCriteria.rubricVersionId, submission.rubricVersionId)).orderBy(asc(rubricCriteria.order));
    const [run] = await db.insert(analysisRuns).values({ submissionId: submission.id, jobId: job.id, model: env().GEMINI_MODEL, promptVersion: "buktipraktik-v1", startedAt }).returning(); runId = run.id;
    const result = await analyzeVideo({ objectKey: submission.objectKey, mimeType: submission.mimeType, durationMs: submission.durationMs, criteria: criteria.map(({ id, code, title, description }) => ({ id, code, title, description })) });
    await db.transaction(async (tx) => {
      if (result.criteria.length) await tx.insert(analysisEvidence).values(result.criteria.map((x) => ({ analysisRunId: run.id, criterionId: x.criterionId, status: x.status, startMs: x.startMs, endMs: x.endMs, evidence: x.evidence, quality: x.evidenceQuality })));
      await tx.update(analysisRuns).set({ rawResponse: result, finishedAt: new Date(), updatedAt: new Date() }).where(eq(analysisRuns.id, run.id));
      await tx.update(analysisJobs).set({ status: "SUCCEEDED", lockedAt: null, lockedBy: null, updatedAt: new Date() }).where(eq(analysisJobs.id, job.id));
      await tx.update(submissions).set({ status: "AWAITING_REVIEW", updatedAt: new Date() }).where(eq(submissions.id, submission.id));
      await tx.insert(submissionEvents).values({ submissionId: submission.id, type: "ANALYSIS_COMPLETED" });
    });
  } catch (error) {
    const retry = job.attempts < env().WORKER_MAX_ATTEMPTS; const delay = job.attempts === 1 ? 30 : 120;
    await db.transaction(async (tx) => {
      if (runId) await tx.update(analysisRuns).set({ finishedAt: new Date(), rawResponse: { error: error instanceof Error ? error.message : String(error) }, updatedAt: new Date() }).where(eq(analysisRuns.id, runId));
      await tx.update(analysisJobs).set({ status: retry ? "RETRY_SCHEDULED" : "FAILED", availableAt: new Date(Date.now() + delay * 1000), lockedAt: null, lockedBy: null, lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error), updatedAt: new Date() }).where(eq(analysisJobs.id, job.id));
      await tx.update(submissions).set({ status: retry ? "QUEUED" : "ANALYSIS_FAILED", updatedAt: new Date() }).where(eq(submissions.id, job.submission_id));
      await tx.insert(submissionEvents).values({ submissionId: job.submission_id, type: retry ? "ANALYSIS_RETRY_SCHEDULED" : "ANALYSIS_FAILED", payload: { attempt: job.attempts } });
    });
  }
  return true;
}
