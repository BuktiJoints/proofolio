import { and, asc, eq } from "drizzle-orm";
import { db, pool } from "@/server/db";
import {
  analysisEvidence,
  analysisJobs,
  analysisRuns,
  rubricCriteria,
  submissionEvents,
  submissions,
} from "@/server/db/schema";
import { transitionSubmission, transitionSubmissionWithClient } from "@/server/domain/states";
import { env } from "@/server/env";
import { analyzeVideo } from "@/server/integrations/gemini";

type Claimed = { id: string; submission_id: string; attempts: number };

export async function claimJob(workerId: string): Promise<Claimed | null> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<Claimed & {
      job_status: typeof analysisJobs.$inferSelect.status;
      submission_status: typeof submissions.$inferSelect.status;
    }>(`
      select j.id, j.submission_id, j.attempts, j.status as job_status,
             s.status as submission_status
      from analysis_jobs j
      join submissions s on s.id = j.submission_id
      where (
        j.status in ('PENDING', 'RETRY_SCHEDULED') and j.available_at <= now()
      ) or (
        j.status = 'RUNNING' and j.locked_at < now() - ($1 * interval '1 millisecond')
      )
      order by j.available_at
      for update of j, s skip locked
      limit 1
    `, [env().WORKER_LEASE_MS]);
    const job = result.rows[0];
    if (!job) {
      await client.query("commit");
      return null;
    }
    const reclaimed = job.job_status === "RUNNING";
    if (reclaimed && job.attempts >= env().WORKER_MAX_ATTEMPTS) {
      await client.query(`
        update analysis_jobs
        set status='FAILED', locked_at=null, locked_by=null,
            last_error='Worker lease expired after maximum attempts', updated_at=now()
        where id=$1
      `, [job.id]);
      if (job.submission_status === "ANALYZING") {
        await transitionSubmissionWithClient(
          client,
          { id: job.submission_id, status: job.submission_status },
          "ANALYSIS_FAILED",
          { type: "ANALYSIS_FAILED", payload: { attempt: job.attempts, reason: "lease_expired" } },
        );
      }
      await client.query("commit");
      return null;
    }
    await client.query(`
      update analysis_jobs
      set status='RUNNING', attempts=attempts+1, locked_at=now(), locked_by=$2,
          last_error=case when status='RUNNING' then 'Worker lease expired' else last_error end,
          updated_at=now()
      where id=$1
    `, [job.id, workerId]);
    if (job.submission_status === "QUEUED") {
      await transitionSubmissionWithClient(
        client,
        { id: job.submission_id, status: job.submission_status },
        "ANALYZING",
        { type: "ANALYSIS_STARTED", payload: { attempt: job.attempts + 1, reclaimed } },
      );
    } else if (job.submission_status === "ANALYZING") {
      await client.query(
        "insert into submission_events (submission_id, type, payload) values ($1, 'ANALYSIS_STARTED', $2::jsonb)",
        [job.submission_id, JSON.stringify({ attempt: job.attempts + 1, reclaimed })],
      );
    } else {
      throw new Error(`Analysis job ${job.id} has incompatible submission state ${job.submission_status}`);
    }
    await client.query("commit");
    return { id: job.id, submission_id: job.submission_id, attempts: job.attempts + 1 };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function processOne(workerId: string): Promise<boolean> {
  const job = await claimJob(workerId);
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void db.update(analysisJobs).set({ lockedAt: new Date(), updatedAt: new Date() }).where(and(
      eq(analysisJobs.id, job.id),
      eq(analysisJobs.status, "RUNNING"),
      eq(analysisJobs.lockedBy, workerId),
    )).catch(() => undefined);
  }, env().WORKER_HEARTBEAT_MS);
  heartbeat.unref();
  const startedAt = new Date();
  let runId: string | undefined;
  try {
    const [submission] = await db.select().from(submissions)
      .where(eq(submissions.id, job.submission_id)).limit(1);
    if (!submission) throw new Error("Submission not found");
    const criteria = await db.select().from(rubricCriteria)
      .where(eq(rubricCriteria.rubricVersionId, submission.rubricVersionId))
      .orderBy(asc(rubricCriteria.order));
    const [run] = await db.insert(analysisRuns).values({
      submissionId: submission.id,
      jobId: job.id,
      model: env().GEMINI_MODEL,
      promptVersion: "buktipraktik-v1",
      startedAt,
    }).returning();
    runId = run.id;
    const result = await analyzeVideo({
      objectKey: submission.objectKey,
      mimeType: submission.mimeType,
      durationMs: submission.durationMs,
      criteria: criteria.map(({ id, code, title, description }) => ({ id, code, title, description })),
    });
    await db.transaction(async (tx) => {
      const [ownedJob] = await tx.select().from(analysisJobs).where(and(
        eq(analysisJobs.id, job.id),
        eq(analysisJobs.status, "RUNNING"),
        eq(analysisJobs.lockedBy, workerId),
      )).limit(1).for("update");
      if (!ownedJob) throw new Error("Analysis job lease was lost");
      const [currentSubmission] = await tx.select().from(submissions)
        .where(eq(submissions.id, submission.id)).limit(1).for("update");
      if (!currentSubmission) throw new Error("Submission not found");
      if (result.criteria.length) await tx.insert(analysisEvidence).values(
        result.criteria.map((item) => ({
          analysisRunId: run.id,
          criterionId: item.criterionId,
          status: item.status,
          startMs: item.startMs,
          endMs: item.endMs,
          evidence: item.evidence,
          quality: item.evidenceQuality,
        })),
      );
      await tx.update(analysisRuns).set({
        rawResponse: result,
        finishedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(analysisRuns.id, run.id));
      await tx.update(analysisJobs).set({
        status: "SUCCEEDED",
        lockedAt: null,
        lockedBy: null,
        updatedAt: new Date(),
      }).where(eq(analysisJobs.id, job.id));
      await transitionSubmission(tx, currentSubmission, "AWAITING_REVIEW", {
        type: "ANALYSIS_COMPLETED",
        payload: { attempt: job.attempts },
      });
    });
  } catch (error) {
    const retry = job.attempts < env().WORKER_MAX_ATTEMPTS;
    const delaySeconds = job.attempts === 1 ? 30 : 120;
    await db.transaction(async (tx) => {
      const [ownedJob] = await tx.select().from(analysisJobs).where(and(
        eq(analysisJobs.id, job.id),
        eq(analysisJobs.status, "RUNNING"),
        eq(analysisJobs.lockedBy, workerId),
      )).limit(1).for("update");
      if (!ownedJob) return;
      if (runId) await tx.update(analysisRuns).set({
        finishedAt: new Date(),
        rawResponse: { error: error instanceof Error ? error.message : "Analysis failed" },
        updatedAt: new Date(),
      }).where(eq(analysisRuns.id, runId));
      await tx.update(analysisJobs).set({
        status: retry ? "RETRY_SCHEDULED" : "FAILED",
        availableAt: new Date(Date.now() + delaySeconds * 1000),
        lockedAt: null,
        lockedBy: null,
        lastError: error instanceof Error ? error.message.slice(0, 2000) : String(error),
        updatedAt: new Date(),
      }).where(eq(analysisJobs.id, job.id));
      const [submission] = await tx.select().from(submissions)
        .where(eq(submissions.id, job.submission_id)).limit(1).for("update");
      if (!submission) return;
      if (retry) {
        await tx.insert(submissionEvents).values({
          submissionId: job.submission_id,
          type: "ANALYSIS_RETRY_SCHEDULED",
          payload: { attempt: job.attempts, delaySeconds },
        });
      } else {
        await transitionSubmission(tx, submission, "ANALYSIS_FAILED", {
          type: "ANALYSIS_FAILED",
          payload: { attempt: job.attempts },
        });
      }
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
