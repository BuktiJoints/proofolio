ALTER TABLE "student_profiles" ADD COLUMN "nisn" varchar(10);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "student_profiles" ADD COLUMN "notification_status_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_evidence_criterion_unique" ON "analysis_evidence" USING btree ("analysis_run_id","criterion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "analysis_job_active_unique" ON "analysis_jobs" USING btree ("submission_id") WHERE "analysis_jobs"."status" in ('PENDING', 'RUNNING', 'RETRY_SCHEDULED');--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_nisn_unique" UNIQUE("nisn");