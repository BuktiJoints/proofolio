import { test, expect } from "@playwright/test";
import { actors } from "./fixtures";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
test("video upload accepts 3.6 MB and inclusive duration boundary, rejects excess duration with precise error", async () => {
  const fixture = await actors();
  const dir = mkdtempSync(join(tmpdir(), "bukti-upload-check-"));
  try {
    await fixture.student.context.patch("/api/v1/me/profile", {
      data: {
        name: "Upload test",
        schoolName: "SMK Test",
        programKeahlian: "Teknik Komputer",
      },
    });
    const response = await fixture.assessor.context.post("/api/v1/rubrics", {
      data: {
        title: "Upload boundary test",
        criteria: [
          {
            code: "TEST",
            title: "Prosedur aman",
            description: "Praktik dilakukan dengan aman",
            order: 1,
            required: true,
            maxScore: 100,
          },
        ],
      },
    });
    const rubric = (await response.json()).data;
    await fixture.assessor.context.post(`/api/v1/rubrics/${rubric.id}/publish`);
    for (const duration of [6, 120, 121]) {
      const path = join(dir, `test-${duration}.mp4`);
      const flags =
        duration === 6
          ? [
              "-r",
              "25",
              "-b:v",
              "5M",
              "-minrate",
              "5M",
              "-maxrate",
              "5M",
              "-bufsize",
              "10M",
              "-x264-params",
              "nal-hrd=cbr:force-cfr=1",
            ]
          : ["-r", "1"];
      execFileSync(
        "ffmpeg",
        [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=blue:s=320x240:r=${duration === 6 ? 25 : 1}:d=${duration}`,
          "-c:v",
          "libx264",
          "-pix_fmt",
          "yuv420p",
          ...flags,
          path,
        ],
        { stdio: "ignore" },
      );
      const bytes = readFileSync(path);
      const uploaded = await fixture.student.context.post(
        "/api/v1/submissions",
        {
          multipart: {
            rubricVersionId: rubric.version.id,
            video: {
              name: "practice.mp4",
              mimeType: "video/mp4",
              buffer: bytes,
            },
          },
        },
      );
      const result = await uploaded.json();
      expect(uploaded.status()).toBe(duration > 120 ? 413 : 202);
      if (duration > 120) {
        expect(result.error.code).toBe("VIDEO_TOO_LONG");
        expect(result.error.fields.durationMs).toBe(121000);
        expect(result.error.fields.maxDurationMs).toBe(120000);
      } else expect(result.data.durationMs).toBe(duration * 1000);
      if (result.data?.id) {
        for (let i = 0; i < 20; i++) {
          const detail = await fixture.student.context.get(
            `/api/v1/submissions/${result.data.id}`,
          );
          const data = (await detail.json()).data;
          if (
            data.status === "AWAITING_REVIEW" ||
            data.status === "ANALYSIS_FAILED"
          )
            break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
  } finally {
    const rows = await fixture.pool.query(
      "select object_key from submissions where organization_id=$1",
      [fixture.orgId],
    );
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    for (const row of rows.rows)
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET ?? "bukti-praktik",
          Key: row.object_key,
        }),
      );
    client.destroy();
    await fixture.cleanup();
    rmSync(dir, { recursive: true, force: true });
  }
});
