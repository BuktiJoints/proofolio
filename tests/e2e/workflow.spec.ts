import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { actors, baseURL, pdfFixture } from "./fixtures";
test("student registration → PDF rubric → video → assessor review → portfolio → public share and revoke", async ({
  browser,
}) => {
  const fixture = await actors();
  const dir = mkdtempSync(join(tmpdir(), "bukti-fe-test-"));
  const studentContext = await browser.newContext({ baseURL });
  const assessorContext = await browser.newContext({ baseURL });
  const publicContext = await browser.newContext({ baseURL });
  const studentPage = await studentContext.newPage();
  const assessorPage = await assessorContext.newPage();
  const publicPage = await publicContext.newPage();
  const failures: string[] = [];
  for (const page of [studentPage, assessorPage, publicPage])
    page.on("pageerror", (error) => failures.push(error.name));
  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=blue:s=320x240:d=6",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        join(dir, "practice.mp4"),
      ],
      { stdio: "ignore" },
    );
    const screenshots = process.env.TEST_SCREENSHOTS;
    if (screenshots) mkdirSync(screenshots, { recursive: true });
    const registeredEmail = `browser-${fixture.run}@example.test`;
    await studentPage.goto("/register");
    await studentPage.evaluate(() => document.fonts.ready);
    expect(
      await studentPage.evaluate(() =>
        getComputedStyle(document.documentElement).fontFamily.includes(
          "GeistSans",
        ),
      ),
    ).toBe(true);
    await studentPage
      .getByLabel("Nama lengkap", { exact: true })
      .fill("Siswa pengujian");
    await studentPage
      .getByLabel("Email", { exact: true })
      .fill(registeredEmail);
    await studentPage
      .getByLabel("Kata sandi", { exact: true })
      .fill(fixture.password);
    await studentPage
      .getByRole("button", { name: "Daftar", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", { name: "Profil saya" }),
    ).toBeVisible();
    const registered = await fixture.pool.query(
      "select id from users where email=$1",
      [registeredEmail],
    );
    const studentId = registered.rows[0].id;
    fixture.trackUser(studentId);
    await fixture.pool.query(
      "update users set organization_id=$1 where id=$2",
      [fixture.orgId, studentId],
    );
    await studentPage.goto("/student/submissions/new");
    await expect(
      studentPage.getByText("Lengkapi profil terlebih dahulu", { exact: true }),
    ).toBeVisible();
    await studentPage
      .getByRole("link", { name: "Lengkapi profil", exact: true })
      .click();
    await studentPage
      .getByLabel("NISN", { exact: true })
      .fill("1234567891");
    await studentPage
      .getByLabel("Nomor telepon", { exact: true })
      .fill("081234567891");
    await studentPage
      .getByLabel("Nama sekolah", { exact: true })
      .fill("SMK Pengujian");
    await studentPage
      .getByLabel("Program keahlian", { exact: true })
      .fill("Teknik Komputer");
    await studentPage
      .getByRole("button", { name: "Simpan profil", exact: true })
      .click();
    await expect(
      studentPage.getByText("Profil berhasil disimpan", { exact: true }),
    ).toBeVisible();
    await assessorPage.goto("/login");
    await assessorPage
      .getByLabel("Email", { exact: true })
      .fill(fixture.assessor.email);
    await assessorPage
      .getByLabel("Kata sandi", { exact: true })
      .fill(fixture.password);
    await assessorPage
      .getByRole("button", { name: "Masuk", exact: true })
      .click();
    await expect(
      assessorPage.getByRole("heading", { name: "Dashboard asesor" }),
    ).toBeVisible();
    await assessorPage.goto("/assessor/rubrics/new");
    await assessorPage
      .getByLabel("File rubrik PDF", { exact: true })
      .setInputFiles({
        name: "rubric.pdf",
        mimeType: "application/pdf",
        buffer: pdfFixture(),
      });
    await assessorPage
      .getByRole("button", { name: "Ekstrak rubrik", exact: true })
      .click();
    await expect(
      assessorPage.getByText(/Mode simulasi: hasil contoh/),
    ).toBeVisible();
    await assessorPage
      .getByRole("button", {
        name: "Gunakan hasil dan ganti isi form",
        exact: true,
      })
      .click();
    const title = `Rubrik browser ${fixture.run}`;
    await assessorPage.getByLabel("Judul rubrik", { exact: true }).fill(title);
    await assessorPage.getByLabel("Skor maksimal", { exact: true }).fill("80");
    await assessorPage
      .getByRole("button", { name: "Tambah kriteria", exact: true })
      .click();
    await assessorPage.getByLabel("Kode", { exact: true }).nth(1).fill("OPT");
    await assessorPage
      .getByLabel("Judul kriteria", { exact: true })
      .nth(1)
      .fill("Dokumentasi opsional");
    await assessorPage
      .getByLabel("Deskripsi yang dapat diamati", { exact: true })
      .nth(1)
      .fill("Dokumentasi langkah praktik terlihat");
    await assessorPage
      .getByLabel("Skor maksimal", { exact: true })
      .nth(1)
      .fill("20");
    await assessorPage
      .getByRole("checkbox", { name: "Kriteria wajib", exact: true })
      .nth(1)
      .uncheck();
    await assessorPage
      .getByRole("button", { name: "Simpan draft rubrik", exact: true })
      .click();
    await expect(
      assessorPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await assessorPage
      .getByRole("button", { name: "Terbitkan rubrik tersimpan", exact: true })
      .click();
    await expect(
      assessorPage.getByText("Terbit", { exact: true }),
    ).toBeVisible();
    await studentPage.goto("/student/rubrics");
    await expect(studentPage.getByText(title, { exact: true })).toBeVisible();
    await studentPage
      .getByRole("link", { name: "Lihat rubrik", exact: true })
      .click();
    await studentPage
      .getByRole("link", {
        name: "Ajukan video dengan rubrik ini",
        exact: true,
      })
      .click();
    await studentPage
      .getByLabel("Video praktik", { exact: true })
      .setInputFiles(join(dir, "practice.mp4"));
    await studentPage
      .getByRole("button", { name: "Kirim video praktik", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    const submissionId = studentPage.url().split("/").at(-1)!;
    await expect
      .poll(
        async () => {
          const response = await studentPage.request.get(
            `/api/v1/submissions/${submissionId}`,
          );
          return (await response.json()).data.status;
        },
        { timeout: 90_000 },
      )
      .toBe("AWAITING_REVIEW");
    const range = await studentPage.request.get(
      `/api/v1/submissions/${submissionId}/video`,
      { headers: { Range: "bytes=0-15" } },
    );
    expect(range.status()).toBe(206);
    expect((await range.body()).length).toBe(16);
    await assessorPage.goto(`/assessor/submissions/${submissionId}`);
    await assessorPage
      .getByRole("button", { name: "Mulai review", exact: true })
      .click();
    await expect(
      assessorPage.getByRole("heading", {
        name: "Penilaian asesor",
        exact: true,
      }),
    ).toBeVisible();
    await assessorPage
      .getByRole("button", { name: /Lihat bukti/ })
      .first()
      .click();
    expect(
      await assessorPage
        .locator("video")
        .evaluate((video: HTMLVideoElement) => video.currentTime >= 0),
    ).toBe(true);
    if (screenshots) {
      await assessorPage.evaluate(() => window.scrollTo(0, 0));
      await assessorPage.screenshot({
        path: join(screenshots, "review-desktop.png"),
        fullPage: true,
      });
    }
    await assessorPage
      .getByLabel("Nilai Melakukan prosedur praktik", { exact: true })
      .fill("64");
    await assessorPage
      .getByLabel("Feedback untuk siswa", { exact: true })
      .fill("Prosedur praktik sudah baik; lengkapi dokumentasi.");
    await assessorPage
      .getByRole("button", { name: "Simpan draft penilaian", exact: true })
      .click();
    await expect(
      assessorPage.getByText("Draft penilaian tersimpan", { exact: true }),
    ).toBeVisible();
    const detail = (
      await (
        await studentPage.request.get(`/api/v1/submissions/${submissionId}`)
      ).json()
    ).data;
    expect(detail.review === null).toBe(true);
    expect(Object.hasOwn(detail.analysis, "rawResponse")).toBe(false);
    await assessorPage.reload();
    await expect(
      assessorPage.getByLabel("Nilai Melakukan prosedur praktik", {
        exact: true,
      }),
    ).toHaveValue("64");
    await assessorPage
      .getByRole("button", { name: "Finalisasi penilaian", exact: true })
      .click();
    await assessorPage
      .getByRole("button", { name: "Ya, finalisasi", exact: true })
      .click();
    await expect(
      assessorPage.getByText("Skor akhir: 64.00 / 100", { exact: true }),
    ).toBeVisible();
    await studentPage.reload();
    await expect(
      studentPage.getByText("Skor akhir: 64.00 / 100", { exact: true }),
    ).toBeVisible();
    await studentPage.goto("/student/portfolio");
    await studentPage
      .getByRole("button", { name: "Buat tautan berbagi", exact: true })
      .click();
    await expect(
      studentPage.getByLabel("Tautan baru", { exact: true }),
    ).toBeVisible();
    const publicUrl = await studentPage
      .getByLabel("Tautan baru", { exact: true })
      .inputValue();
    await publicPage.goto(publicUrl);
    await expect(
      publicPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      publicPage.getByText("64.00 / 100", { exact: true }),
    ).toBeVisible();
    await studentPage
      .getByRole("button", { name: "Cabut tautan", exact: true })
      .click();
    await expect(
      studentPage.getByText("Dicabut", { exact: true }),
    ).toBeVisible();
    await publicPage.reload();
    await expect(
      publicPage.getByText("Tautan tidak tersedia", { exact: true }),
    ).toBeVisible();
    await studentPage.setViewportSize({ width: 390, height: 844 });
    await studentPage.goto("/student/dashboard");
    await studentPage
      .getByRole("button", { name: "Buka navigasi", exact: true })
      .click();
    await expect(studentPage.getByRole("dialog")).toBeVisible();
    await studentPage.keyboard.press("Escape");
    if (screenshots)
      await studentPage.screenshot({
        path: join(screenshots, "dashboard-mobile.png"),
        fullPage: true,
      });
    await studentPage
      .getByRole("button", { name: "Keluar", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", { name: "Masuk ke akun", exact: true }),
    ).toBeVisible();
    await studentPage.goto("/assessor/dashboard");
    await expect(
      studentPage.getByRole("heading", { name: "Masuk ke akun", exact: true }),
    ).toBeVisible();
    expect(failures.length).toBe(0);
  } finally {
    // Remove only fixture video objects, then fixture rows. No secrets or tokens are printed.
    const objects = await fixture.pool.query(
      "select object_key from submissions where organization_id=$1",
      [fixture.orgId],
    );
    const { S3Client, DeleteObjectCommand } =
      await import("@aws-sdk/client-s3");
    const storage = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION ?? "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    for (const row of objects.rows)
      await storage
        .send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET ?? "bukti-praktik",
            Key: row.object_key,
          }),
        )
        .catch(() => undefined);
    storage.destroy();
    await Promise.all([
      studentContext.close(),
      assessorContext.close(),
      publicContext.close(),
    ]);
    await fixture.cleanup();
    rmSync(dir, { recursive: true, force: true });
  }
});
