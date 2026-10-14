import { test, expect, request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { actors, baseURL, pdfFixture } from "./fixtures";
test("API boundaries, extraction, immutable versions, scoring and concurrency on PostgreSQL", async () => {
  const fixture = await actors();
  const { pool, assessor, student, outsider, secondAssessor } = fixture;
  const publicRequest = await request.newContext({ baseURL });
  try {
    const extract = (context: typeof assessor.context) =>
      context.post("/api/v1/rubrics/extract", {
        multipart: {
          file: {
            name: "rubric.pdf",
            mimeType: "application/pdf",
            buffer: pdfFixture(),
          },
        },
      });
    expect((await extract(publicRequest)).status()).toBe(401);
    expect((await extract(student.context)).status()).toBe(403);
    const extraction = await extract(assessor.context);
    expect(extraction.status()).toBe(200);
    const suggestion = (await extraction.json()).data;
    expect(suggestion.simulated).toBe(true);
    expect(suggestion.requiresHumanReview).toBe(true);
    expect(suggestion.draft.criteria.length).toBeGreaterThan(0);
    const untouched = await pool.query(
      "select count(*)::int as n from rubrics where organization_id=$1",
      [fixture.orgId],
    );
    expect(untouched.rows[0].n).toBe(0);
    expect(
      (
        await assessor.context.post("/api/v1/rubrics/extract", {
          multipart: {
            file: {
              name: "spoof.pdf",
              mimeType: "application/pdf",
              buffer: Buffer.from("not PDF"),
            },
          },
        })
      ).status(),
    ).toBe(415);
    expect(
      (
        await assessor.context.post("/api/v1/rubrics/extract", { data: {} })
      ).status(),
    ).toBe(415);
    const body = {
      title: `Rubric ${fixture.run}`,
      criteria: [
        {
          code: "REQ",
          title: "Prosedur aman",
          description: "Langkah praktik aman",
          order: 1,
          required: true,
          maxScore: 80,
        },
        {
          code: "OPT",
          title: "Dokumentasi",
          description: "Dokumentasi terlihat",
          order: 2,
          required: false,
          maxScore: 20,
        },
      ],
    };
    const created = await assessor.context.post("/api/v1/rubrics", {
      data: body,
    });
    expect(created.status()).toBe(201);
    const rubric = (await created.json()).data;
    expect(
      (await outsider.context.get(`/api/v1/rubrics/${rubric.id}`)).status(),
    ).toBe(404);
    expect(
      (await student.context.get(`/api/v1/rubrics/${rubric.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await assessor.context.post(`/api/v1/rubrics/${rubric.id}/publish`)
      ).status(),
    ).toBe(200);
    const original = (
      await (await assessor.context.get(`/api/v1/rubrics/${rubric.id}`)).json()
    ).data.versions[0];
    const subId = randomUUID();
    await pool.query(
      "insert into submissions (id,organization_id,student_id,rubric_version_id,status,original_filename,object_key,mime_type,size_bytes,duration_ms,sha256) values ($1,$2,$3,$4,'AWAITING_REVIEW','fixture.mp4',$5,'video/mp4',1,5000,$6)",
      [
        subId,
        fixture.orgId,
        student.id,
        original.id,
        `test/${fixture.run}`,
        "a".repeat(64),
      ],
    );
    expect(
      (await outsider.context.get(`/api/v1/submissions/${subId}`)).status(),
    ).toBe(404);
    expect(
      (
        await student.context.post(`/api/v1/submissions/${subId}/review/start`)
      ).status(),
    ).toBe(403);
    const claims = await Promise.all([
      assessor.context.post(`/api/v1/submissions/${subId}/review/start`),
      assessor.context.post(`/api/v1/submissions/${subId}/review/start`),
    ]);
    expect(claims.map((response) => response.status()).sort()).toEqual([
      200, 201,
    ]);
    expect(
      (
        await secondAssessor.context.post(
          `/api/v1/submissions/${subId}/review/start`,
        )
      ).status(),
    ).toBe(409);
    const reviewBody = {
      feedback: "Draft pribadi",
      items: [
        {
          criterionId: original.criteria[0].id,
          decision: "CONFIRMED",
          score: 64,
        },
      ],
    };
    expect(
      (
        await assessor.context.put(`/api/v1/submissions/${subId}/review`, {
          data: reviewBody,
        })
      ).status(),
    ).toBe(200);
    const hidden = (
      await (await student.context.get(`/api/v1/submissions/${subId}`)).json()
    ).data;
    expect(hidden.review === null).toBe(true);
    const finals = await Promise.all([
      assessor.context.post(`/api/v1/submissions/${subId}/review/finalize`, {
        data: reviewBody,
      }),
      assessor.context.post(`/api/v1/submissions/${subId}/review/finalize`, {
        data: reviewBody,
      }),
    ]);
    expect(finals.map((response) => response.status())).toEqual([200, 200]);
    const final = (
      await (await student.context.get(`/api/v1/submissions/${subId}`)).json()
    ).data;
    expect(Number(final.normalizedScore)).toBe(64);
    expect(final.review.feedback === "Draft pribadi").toBe(true);
    const events = await pool.query(
      "select count(*)::int as n from submission_events where submission_id=$1 and type='REVIEW_FINALIZED'",
      [subId],
    );
    expect(events.rows[0].n).toBe(1);
    expect(
      (
        await assessor.context.put(`/api/v1/submissions/${subId}/review`, {
          data: reviewBody,
        })
      ).status(),
    ).toBe(409);
    const version = await assessor.context.post(
      `/api/v1/rubrics/${rubric.id}/versions`,
    );
    expect(version.status()).toBe(201);
    expect(
      (
        await assessor.context.put(`/api/v1/rubrics/${rubric.id}/draft`, {
          data: { ...body, title: "Revisi rubrik" },
        })
      ).status(),
    ).toBe(200);
    const after = (
      await (await assessor.context.get(`/api/v1/rubrics/${rubric.id}`)).json()
    ).data;
    expect(after.versions[0].title === original.title).toBe(true);
    expect(
      after.versions[0].criteria.map((item: { id: string }) => item.id),
    ).toEqual(original.criteria.map((item: { id: string }) => item.id));
    expect(after.versions[1].title).toBe("Revisi rubrik");
    const versions = await Promise.all([
      assessor.context.post(`/api/v1/rubrics/${rubric.id}/versions`),
      assessor.context.post(`/api/v1/rubrics/${rubric.id}/versions`),
    ]);
    expect(versions.map((response) => response.status())).toEqual([201, 201]);
    const numbers = await Promise.all(
      versions.map(async (response) => (await response.json()).data.version),
    );
    expect(new Set(numbers).size).toBe(2);
    for (const path of [
      "/api/v1/submissions/nope",
      "/api/v1/rubrics/nope",
      "/api/v1/submissions?page=no",
      "/api/v1/submissions?limit=101",
      "/api/v1/submissions?status=INVALID",
    ])
      expect((await assessor.context.get(path)).status()).toBe(400);
    const retryId = randomUUID();
    await pool.query(
      "insert into submissions (id,organization_id,student_id,rubric_version_id,status,original_filename,object_key,mime_type,size_bytes,duration_ms,sha256) values ($1,$2,$3,$4,'ANALYSIS_FAILED','retry.mp4',$5,'video/mp4',1,5000,$6)",
      [
        retryId,
        fixture.orgId,
        student.id,
        original.id,
        `retry/${fixture.run}`,
        "b".repeat(64),
      ],
    );
    const retries = await Promise.all([
      student.context.post(`/api/v1/submissions/${retryId}/retry-analysis`),
      student.context.post(`/api/v1/submissions/${retryId}/retry-analysis`),
    ]);
    expect(retries.map((response) => response.status())).toEqual([200, 200]);
    const jobs = await pool.query(
      "select count(*)::int as n from analysis_jobs where submission_id=$1",
      [retryId],
    );
    expect(jobs.rows[0].n).toBe(1);
  } finally {
    await publicRequest.dispose();
    await fixture.cleanup();
  }
});
