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
    async function capture(page: typeof studentPage, name: string) {
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (screenshots)
        await page.screenshot({
          path: join(screenshots, `${name}.png`),
          fullPage: true,
        });
    }
    const registeredEmail = `browser-${fixture.run}@example.test`;
    await studentPage.goto("/register");
    await studentPage.evaluate(() => document.fonts.ready);
    expect(
      await studentPage.evaluate(() =>
        getComputedStyle(document.documentElement).fontFamily.includes(
          "poppins",
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
    await studentPage.getByLabel("NISN", { exact: true }).fill("1234567891");
    await studentPage
      .getByLabel("Nomor telepon", { exact: true })
      .fill("081234567891");
    await studentPage
      .getByLabel("Asal Sekolah SMK", { exact: true })
      .fill("SMK Pengujian");
    await studentPage
      .getByLabel("Jurusan / Bidang Keahlian", { exact: true })
      .fill("Teknik Komputer");
    await studentPage
      .getByRole("button", { name: "Buat Akun Siswa", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", { name: "Halo, Siswa pengujian!" }),
    ).toBeVisible();
    await capture(studentPage, "student-dashboard-desktop");
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
    await studentPage.goto("/student/profile");
    await studentPage
      .getByRole("button", { name: "Edit Profil", exact: true })
      .click();
    await studentPage.getByLabel("NISN", { exact: true }).fill("1234567891");
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
    await assessorPage.goto("/assessor/login");
    await assessorPage
      .getByLabel("Email / NIP", { exact: true })
      .fill(fixture.assessor.email);
    await assessorPage
      .getByLabel("Kata sandi", { exact: true })
      .fill(fixture.password);
    await assessorPage
      .getByRole("button", { name: "Masuk Portal Asesor", exact: true })
      .click();
    await expect(
      assessorPage.getByRole("heading", { name: /Selamat datang/ }),
    ).toBeVisible();
    await capture(assessorPage, "assessor-dashboard-desktop");
    await assessorPage.goto("/assessor/rubrics/new");
    await assessorPage
      .getByLabel("File rubrik PDF", { exact: true })
      .setInputFiles({
        name: "rubric.pdf",
        mimeType: "application/pdf",
        buffer: pdfFixture(),
      });
    await assessorPage
      .getByRole("button", {
        name: "Generate Rubrik Digital via AI",
        exact: true,
      })
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
    await assessorPage
      .getByLabel("Judul Modul UKK", { exact: true })
      .fill(title);
    await assessorPage
      .getByLabel("Bobot kriteria 1", { exact: true })
      .fill("80");
    await assessorPage
      .getByRole("button", { name: "Tambah Kriteria", exact: true })
      .click();
    await assessorPage
      .getByLabel("Judul kriteria 2", { exact: true })
      .fill("Dokumentasi opsional");
    await assessorPage
      .getByLabel("Indikator bukti kriteria 2 ke 1", { exact: true })
      .fill("Dokumentasi langkah praktik terlihat");
    await assessorPage
      .getByLabel("Bobot kriteria 2", { exact: true })
      .fill("20");
    await assessorPage
      .getByText("Pengaturan kriteria", { exact: true })
      .nth(1)
      .click();
    await assessorPage
      .getByRole("checkbox", { name: "Kriteria wajib", exact: true })
      .uncheck();
    await assessorPage
      .getByRole("button", { name: "Simpan Rubrik Digital", exact: true })
      .click();
    await expect(
      assessorPage.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await assessorPage
      .getByRole("button", { name: "Publikasi Rubrik", exact: true })
      .click();
    await expect(
      assessorPage.getByText("• Aktif", { exact: true }),
    ).toBeVisible();
    await studentPage.goto("/student/rubrics");
    await expect(studentPage.getByText(title, { exact: true })).toBeVisible();
    await capture(studentPage, "catalog-desktop");
    await studentPage
      .getByRole("link", { name: "Lihat Detail & Rubrik", exact: true })
      .click();
    await expect(studentPage.getByTestId("criterion-points")).toHaveCount(2);
    const points = await studentPage
      .getByTestId("criterion-points")
      .evaluateAll((items) =>
        items.map((item) => item.getBoundingClientRect().right),
      );
    expect(Math.max(...points) - Math.min(...points)).toBeLessThan(1);
    await studentPage
      .getByRole("link", {
        name: "Pilih Modul & Unggah Video Praktik",
        exact: true,
      })
      .click();
    await studentPage
      .getByLabel("Video praktik", { exact: true })
      .setInputFiles(join(dir, "practice.mp4"));
    await studentPage
      .getByRole("button", { name: "Kumpulkan Video Praktik", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", {
        name: "Video praktik berhasil dikumpulkan!",
      }),
    ).toBeVisible();
    await studentPage
      .getByRole("link", { name: "Pantau Status Penilaian", exact: true })
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
        name: "Detail Penilaian",
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
    await expect(
      assessorPage.getByLabel("Nilai Melakukan prosedur praktik", {
        exact: true,
      }),
    ).toBeVisible();
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
      .getByRole("button", {
        name: "Simpan & Terbitkan Penilaian",
        exact: true,
      })
      .click();
    await assessorPage
      .getByRole("button", { name: "Ya, finalisasi", exact: true })
      .click();
    await expect(assessorPage.getByTestId("final-score")).toBeVisible();
    // Missing evidence timestamps must occupy the same column as actual timestamps.
    await fixture.pool.query(
      "update analysis_evidence set start_ms=null, end_ms=null where id=(select id from analysis_evidence where analysis_run_id in (select id from analysis_runs where submission_id=$1) order by id limit 1)",
      [submissionId],
    );
    await assessorPage.reload();
    await expect(
      assessorPage.getByTestId("evidence-timestamp").first(),
    ).toBeVisible();
    const timestampBoxes = await assessorPage
      .getByTestId("evidence-timestamp")
      .evaluateAll((items) =>
        items.map((item) => {
          const r = item.getBoundingClientRect();
          return {
            width: r.width,
            height: r.height,
            left: r.left,
            disabled: (item as HTMLButtonElement).disabled,
          };
        }),
      );
    expect(timestampBoxes.some((box) => box.disabled)).toBe(true);
    expect(timestampBoxes.some((box) => !box.disabled)).toBe(true);
    expect(
      new Set(
        timestampBoxes.map((box) => `${box.width}/${box.height}/${box.left}`),
      ).size,
    ).toBe(1);

    await capture(assessorPage, "evidence-aligned-desktop");
    await assessorPage.setViewportSize({ width: 390, height: 844 });
    await capture(assessorPage, "evidence-aligned-mobile");
    await assessorPage.setViewportSize({ width: 1280, height: 900 });
    await studentPage.reload();
    await expect(studentPage.getByTestId("final-score")).toBeVisible();
    await studentPage
      .getByRole("button", {
        name: "Tambahkan ke Digital Portofolio",
        exact: true,
      })
      .click();
    await expect(
      studentPage.getByRole("heading", {
        name: "Daftar Bukti Kompetensi",
        exact: true,
      }),
    ).toBeVisible();
    await capture(studentPage, "portfolio-desktop");
    await studentPage
      .getByRole("button", { name: "Bagikan bukti video", exact: true })
      .click();
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
    await expect(
      studentPage.getByRole("heading", {
        name: "Halo, Siswa pengujian!",
        exact: true,
      }),
    ).toBeVisible();
    await capture(studentPage, "dashboard-mobile");
    for (const [path, title] of [
      ["/student/profile", "Profil Saya"],
      ["/student/portfolio", "Daftar Bukti Kompetensi"],
      ["/student/rubrics", "Eksplorasi Uji Kompetensi Keahlian (UKK)"],
    ]) {
      await studentPage.goto(path);
      await expect(
        studentPage.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await capture(studentPage, `${path.split("/").at(-1)}-mobile`);
    }
    await studentPage
      .getByRole("button", { name: "Keluar", exact: true })
      .click();
    await expect(
      studentPage.getByRole("heading", {
        name: "Selamat Datang di Platform Verifikasi Kompetensi SMK",
        exact: true,
      }),
    ).toBeVisible();
    await studentPage.goto("/assessor/dashboard");
    await expect(
      studentPage.getByRole("heading", {
        name: "Masuk ke Akun Siswa",
        exact: true,
      }),
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
