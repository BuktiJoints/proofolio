import { test, expect, request } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
test("WBS onboarding approval, student queue, metadata and portfolio boundaries", async () => {
  const databaseURL = process.env.DATABASE_URL;
  const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  if (
    !databaseURL ||
    !["localhost", "127.0.0.1"].includes(new URL(databaseURL).hostname) ||
    !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
  )
    throw new Error("WBS tests require local services");
  const pool = new Pool({ connectionString: databaseURL });
  const student = await request.newContext({ baseURL });
  const assessor = await request.newContext({ baseURL });
  const outsider = await request.newContext({ baseURL });
  const publicRequest = await request.newContext({ baseURL });
  const run = randomUUID();
  const org = randomUUID();
  const ids: string[] = [];
  const common = {
    name: `WBS ${run}`,
    email: `student-${run}@example.test`,
    password: `Test-${run}!`,
    schoolName: "SMK Pengujian",
    programKeahlian: "Teknik WBS",
  };
  const nisn = BigInt(`0x${run.replaceAll("-", "").slice(0, 12)}`)
    .toString()
    .slice(0, 10);
  let rubricId: string | undefined;
  try {
    await pool.query(
      "insert into organizations(id,name,slug) values($1,$2,$3)",
      [org, "WBS isolation", `wbs-${run}`],
    );
    const s = await student.post("/api/v1/auth/register", {
      data: { ...common, intent: "STUDENT", nisn, phone: "081389076543" },
    });
    expect(s.status()).toBe(201);
    ids.push((await s.json()).data.id);
    await pool.query("update users set organization_id=$1 where id=$2", [
      org,
      ids[0],
    ]);
    const profile = (await (await student.get("/api/v1/me")).json()).data;
    expect(profile.profile.nisn).toBe(nisn);
    expect(profile.user.accessStatus).toBe("ACTIVE");
    const assessorEmail = `assessor-${run}@example.test`;
    const a = await assessor.post("/api/v1/auth/register", {
      data: {
        ...common,
        email: assessorEmail,
        intent: "ASSESSOR",
        employeeId: "081999999999",
        role: "ASSESSOR",
        accessStatus: "ACTIVE",
        organizationId: org,
      },
    });
    expect(a.status()).toBe(201);
    ids.push((await a.json()).data.id);
    const pending = (await (await assessor.get("/api/v1/me")).json()).data;
    expect(pending.user.role).toBe("STUDENT");
    expect(pending.user.accessStatus).toBe("PENDING");
    expect((await assessor.get("/api/v1/rubrics")).status()).toBe(403);
    expect((await assessor.get("/api/v1/dashboard")).status()).toBe(403);
    const args = [
      "scripts/review-assessor.ts",
      "--id",
      pending.assessorApplication.id,
      "--organization",
      org,
      "--reviewer",
      "WBS test administrator",
    ];
    await Promise.all([exec("bun", args), exec("bun", args)]);
    const approved = (await (await assessor.get("/api/v1/me")).json()).data;
    expect(approved.user.role).toBe("ASSESSOR");
    expect(approved.user.organizationId).toBe(org);
    expect(approved.assessorProfile.employeeId).toBe("081999999999");
    const login = await publicRequest.post("/api/v1/auth/login", {
      data: { identifier: "081999999999", password: common.password },
    });
    expect(login.status()).toBe(200);
    expect(profile.profile.phone).toBe("+6281389076543");
    const phoneContext = await request.newContext({ baseURL });
    const phoneLogin = await phoneContext.post("/api/v1/auth/login", {
      data: { identifier: "081389076543", password: common.password },
    });
    expect(phoneLogin.status()).toBe(200);
    await phoneContext.dispose();
    const o = await outsider.post("/api/auth/sign-up/email", {
      data: { ...common, email: `outsider-${run}@example.test` },
    });
    expect(o.status()).toBe(200);
    ids.push((await o.json()).user.id);
    await pool.query("update users set role='ASSESSOR' where id=$1", [ids[2]]);
    const rubric = await assessor.post("/api/v1/rubrics", {
      data: {
        title: "WBS Keterampilan Mengajar",
        description: "Rubrik pengujian",
        programKeahlian: "Teknik WBS",
        partnerName: "Mitra WBS",
        requirements: "Siapkan alat",
        criteria: [
          {
            code: "TEST",
            title: "Membuka pembelajaran",
            description: "Guru membuka pembelajaran",
            order: 1,
            required: true,
            maxScore: 100,
          },
        ],
      },
    });
    expect(rubric.status()).toBe(201);
    rubricId = (await rubric.json()).data.id;
    expect(
      (await assessor.post(`/api/v1/rubrics/${rubricId}/publish`)).status(),
    ).toBe(200);
    const detail = (
      await (await assessor.get(`/api/v1/rubrics/${rubricId}`)).json()
    ).data;
    const versionId = detail.activeVersionId;
    expect(detail.versions[0].partnerName).toBe("Mitra WBS");
    expect((await outsider.get(`/api/v1/rubrics/${rubricId}`)).status()).toBe(
      404,
    );
    const completed = randomUUID();
    const waiting = randomUUID();
    for (const [id, status] of [
      [completed, "COMPLETED"],
      [waiting, "AWAITING_REVIEW"],
    ])
      await pool.query(
        "insert into submissions (id,organization_id,student_id,rubric_version_id,status,original_filename,object_key,mime_type,size_bytes,duration_ms,sha256,normalized_score,completed_at,portfolio_included) values ($1,$2,$3,$4,$5,'wbs.mp4',$6,'video/mp4',10,1000,$7,$8,$9,false)",
        [
          id,
          org,
          ids[0],
          versionId,
          status,
          `wbs/${id}`,
          "a".repeat(64),
          status === "COMPLETED" ? 88 : null,
          status === "COMPLETED" ? new Date() : null,
        ],
      );
    await pool.query(
      "insert into assessment_reviews(submission_id,assessor_id,feedback,finalized_at) values($1,$2,$3,now())",
      [completed, ids[1], "Feedback final pengujian"],
    );
    const students = await assessor.get(
      `/api/v1/assessments/students?q=${encodeURIComponent(common.name)}`,
    );
    expect(students.status()).toBe(200);
    expect((await students.json()).data[0].submissionCount).toBe(1);
    expect(
      (
        await (
          await outsider.get(
            `/api/v1/assessments/students?q=${encodeURIComponent(common.name)}`,
          )
        ).json()
      ).data,
    ).toHaveLength(0);
    expect((await student.get("/api/v1/assessments/students")).status()).toBe(
      403,
    );
    expect(
      (
        await (
          await assessor.get(
            `/api/v1/submissions?studentId=${ids[0]}&group=completed`,
          )
        ).json()
      ).data,
    ).toHaveLength(1);
    expect(
      (await assessor.get("/api/v1/assessments/students?page=0")).status(),
    ).toBe(400);
    expect(
      (await assessor.get("/api/v1/submissions?studentId=invalid")).status(),
    ).toBe(400);
    expect(
      (await (await student.get("/api/v1/portfolio")).json()).data,
    ).toHaveLength(0);
    expect(
      (await student.post(`/api/v1/submissions/${waiting}/portfolio`)).status(),
    ).toBe(409);
    expect(
      (
        await outsider.post(`/api/v1/submissions/${completed}/portfolio`)
      ).status(),
    ).toBe(403);
    expect(
      (
        await student.post(`/api/v1/submissions/${completed}/portfolio`)
      ).status(),
    ).toBe(200);
    expect(
      (
        await student.post(`/api/v1/submissions/${completed}/portfolio`)
      ).status(),
    ).toBe(200);
    expect(
      (await (await student.get("/api/v1/portfolio")).json()).data,
    ).toHaveLength(1);
    const shares = await Promise.all([
      student.post("/api/v1/portfolio/share"),
      student.post("/api/v1/portfolio/share"),
    ]);
    for (const r of shares) expect(r.status()).toBe(201);
    const tokens = await Promise.all(
      shares.map(async (r) => (await r.json()).data.token),
    );
    const publicResults = await Promise.all(
      tokens.map((t) => publicRequest.get(`/api/public/portfolios/${t}`)),
    );
    expect(publicResults.map((r) => r.status()).sort()).toEqual([200, 404]);
    const active = publicResults.find((r) => r.status() === 200)!;
    const publicData = (await active.json()).data;
    expect(publicData.items).toHaveLength(1);
    expect(publicData.student).not.toHaveProperty("nisn");
    expect(publicData.student).not.toHaveProperty("email");
    expect(publicData.student).not.toHaveProperty("phone");
    expect((await student.delete("/api/v1/portfolio/share")).status()).toBe(
      200,
    );
    for (const token of tokens)
      expect(
        (await publicRequest.get(`/api/public/portfolios/${token}`)).status(),
      ).toBe(404);
    const newShare = (
      await (await student.post("/api/v1/portfolio/share")).json()
    ).data;
    await pool.query(
      "update portfolio_shares set expires_at=now()-interval '1 hour' where id=$1",
      [newShare.id],
    );
    expect(
      (
        await publicRequest.get(`/api/public/portfolios/${newShare.token}`)
      ).status(),
    ).toBe(404);
  } finally {
    await pool.query("delete from submissions where organization_id=$1", [org]);
    if (rubricId)
      await pool.query("delete from rubrics where id=$1", [rubricId]);
    await pool.query("delete from users where id=any($1::text[])", [ids]);
    await pool.query("delete from organizations where id=$1", [org]);
    await Promise.all([
      student.dispose(),
      assessor.dispose(),
      outsider.dispose(),
      publicRequest.dispose(),
    ]);
    await pool.end();
  }
});
