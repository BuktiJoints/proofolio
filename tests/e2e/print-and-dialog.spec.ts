import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const id = "11111111-1111-4111-8111-111111111111";
const me = {
  user: {
    id: "preview",
    name: "Nadia Putri",
    role: "STUDENT",
    accessStatus: "ACTIVE",
    email: "preview@example.test",
  },
  profile: {
    nisn: "0081234567",
    schoolName: "SMK Negeri 1",
    programKeahlian: "Akomodasi Perhotelan",
    phone: "+6281234567890",
  },
};
const criteria = Array.from({ length: 6 }, (_, i) => ({
  id: `criterion-${i}`,
  code: `K${i}`,
  title: `Kriteria ${i + 1}: Menyiapkan kamar untuk tamu`,
  description:
    i === 0
      ? "Indikator panjang: menata perlengkapan dan memastikan kamar siap digunakan.\n".repeat(
          35,
        ) + "AKHIR INDIKATOR PANJANG"
      : "Memeriksa perlengkapan dan memastikan kamar siap digunakan.\nMenerapkan prosedur kerja yang aman.",
  order: i + 1,
  required: true,
  maxScore: 20,
}));
const rubric = {
  id,
  rubricId: id,
  version: 1,
  title: "Menyiapkan Kamar Untuk Tamu",
  description: "Praktik pelayanan kamar hotel sesuai standar operasional.",
  criteria,
};
const submission = {
  id,
  rubricVersionId: id,
  rubricTitle: rubric.title,
  status: "COMPLETED",
  portfolioIncluded: true,
  originalFilename: "praktik.mp4",
  normalizedScore: "90.00",
  durationMs: 120000,
  createdAt: "2026-10-15T00:00:00Z",
  completedAt: "2026-10-16T00:00:00Z",
  rubricVersion: rubric,
  criteria,
  analysis: {
    evidence: criteria.map((c) => ({
      criterionId: c.id,
      status: "OBSERVED",
      startMs: 1000,
      endMs: 8000,
      evidence:
        "Peserta memeriksa perlengkapan, menata trolley dan memastikan area kerja bersih sebelum memulai pelayanan. ".repeat(
          3,
        ),
      quality: "CLEAR",
    })),
  },
  review: {
    id,
    assessorId: "assessor",
    assessorName: "Budi Santoso",
    finalizedAt: "2026-10-16T00:00:00Z",
    feedback:
      "Prosedur sudah baik. Pertahankan kerapian perlengkapan dan ketepatan waktu pelayanan.",
    items: criteria.map((c) => ({
      criterionId: c.id,
      decision: "CONFIRMED",
      score: 18,
      note: "Prosedur telah dilakukan dengan benar.",
    })),
  },
};
async function fixtures(page: import("@playwright/test").Page) {
  await page.route("**/api/v1/me", (r) => r.fulfill({ json: { data: me } }));
  await page.route("**/api/v1/portfolio", (r) =>
    r.fulfill({
      json: {
        data: [
          {
            submission,
            rubric,
            shares: Array.from({ length: 12 }, (_, i) => ({
              id: String(i),
              revokedAt: "2026-10-16T00:00:00Z",
              expiresAt: "2026-10-22T00:00:00Z",
            })),
          },
        ],
      },
    }),
  );
  await page.route("**/api/v1/portfolio/share", (r) =>
    r.fulfill({ json: { data: null } }),
  );
  await page.route(`**/api/v1/submissions/${id}`, (r) =>
    r.fulfill({ json: { data: submission } }),
  );
  await page.route(`**/api/v1/submissions/${id}/video`, (r) =>
    r.fulfill({ status: 404 }),
  );
  await page.route("**/api/public/portfolios/print-fixture", (r) =>
    r.fulfill({
      json: {
        data: {
          student: { name: me.user.name, ...me.profile },
          expiresAt: "2026-10-22T00:00:00Z",
          items: [
            {
              id,
              title: rubric.title,
              description: rubric.description,
              score: "90.00",
              completedAt: submission.completedAt,
              feedback: submission.review.feedback,
            },
          ],
        },
      },
    }),
  );
}
test("A4 exports have readable full-width evidence and exclude screen controls/toasts", async ({
  page,
}) => {
  await fixtures(page);
  await mkdir("/tmp/proofolio-print-review", { recursive: true });
  for (const [name, path, title] of [
    ["portfolio", "/student/portfolio", "Portofolio Kompetensi"],
    ["assessment", `/student/submissions/${id}`, "Bukti Hasil Penilaian"],
    ["public-portfolio", "/p/print-fixture", "Portofolio Kompetensi"],
  ]) {
    await page.goto(path);
    await expect(
      page
        .getByRole("heading", {
          name:
            name === "assessment"
              ? rubric.title
              : name === "portfolio"
                ? "Daftar Bukti Kompetensi"
                : me.user.name,
          exact: true,
        })
        .first(),
    ).toBeVisible();
    await page.evaluate(() => {
      const toast = document.createElement("ol");
      toast.dataset.sonnerToaster = "true";
      toast.textContent = "Notifikasi tidak boleh dicetak";
      document.body.append(toast);
    });
    await page.emulateMedia({ media: "print" });
    const report = page.getByRole("article", { name: title });
    await expect(report).toBeVisible();
    await expect(page.locator("[data-sonner-toaster]")).toBeHidden();
    await expect(page.locator(".screen-only")).toBeHidden();
    await expect(page.locator("[data-app-header]")).toHaveCount(
      name === "public-portfolio" ? 0 : 1,
    );
    await expect
      .poll(() => report.evaluate((el) => el.getBoundingClientRect().width))
      .toBeGreaterThan(600);
    if (name === "assessment") {
      await expect(report.getByText("Nilai akhir: 90.00/100")).toBeVisible();
      await expect(report.locator(".print-result")).toHaveCount(7);
      const width = await report
        .locator(".print-result p")
        .first()
        .evaluate((el) => el.getBoundingClientRect().width);
      expect(width).toBeGreaterThan(500);
    }
    await page.evaluate(() => document.fonts.ready);
    const pdf = await page.pdf({
      path: `/tmp/proofolio-print-review/${name}.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    await page.emulateMedia({ media: "screen" });
    await page
      .locator("[data-sonner-toaster]")
      .evaluateAll((els) => els.forEach((el) => el.remove()));
  }
});
for (const width of [390, 768, 1440])
  test(`share and password dialogs fit viewport at ${width}px`, async ({
    page,
  }) => {
    await fixtures(page);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/student/portfolio");
    await page.getByRole("button", { name: "Bagikan bukti video" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => (await dialog.boundingBox())!.width)
      .toBeGreaterThan(width === 390 ? 350 : 650);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(15);
    expect(bounds!.height).toBeLessThanOrEqual(870);
    await expect(
      dialog.getByRole("button", { name: "Close", exact: true }),
    ).toBeInViewport();
    await expect
      .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
    await dialog.getByRole("button", { name: "Close", exact: true }).click();
    await page.goto("/student/profile");
    await page
      .getByRole("button", { name: "Ubah Password", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => (await dialog.boundingBox())!.width)
      .toBeGreaterThan(width === 390 ? 350 : 550);
    await expect
      .poll(() => dialog.evaluate((el) => el.scrollWidth <= el.clientWidth))
      .toBe(true);
  });

test("AI extraction keeps manual input on provider failure and requires explicit use of the suggestion", async ({
  page,
}) => {
  await fixtures(page);
  await page.unroute("**/api/v1/me");
  await page.route("**/api/v1/me", (r) =>
    r.fulfill({
      json: { data: { ...me, user: { ...me.user, role: "ASSESSOR" } } },
    }),
  );
  let requests = 0;
  await page.route("**/api/v1/rubrics/extract", (r) => {
    requests++;
    return requests === 1
      ? r.fulfill({
          status: 503,
          json: {
            error: {
              code: "RUBRIC_EXTRACTION_BUSY",
              message: "Layanan AI sedang sibuk. Coba lagi.",
              requestId: "test-request",
            },
          },
        })
      : r.fulfill({
          json: {
            data: {
              draft: {
                title: rubric.title,
                description: rubric.description,
                criteria: [
                  {
                    code: "PROSES",
                    title: "Proses Kerja",
                    description: "Indikator lengkap pelayanan kamar. ".repeat(
                      80,
                    ),
                    order: 1,
                    required: true,
                    maxScore: 40,
                  },
                ],
              },
              simulated: false,
              requiresHumanReview: true,
            },
          },
        });
  });
  await page.goto("/assessor/rubrics/new");
  const title = page.getByRole("textbox", {
    name: "Judul Modul UKK",
    exact: true,
  });
  await title.fill("Draf manual saya");
  await page.locator('input[type="file"]').setInputFiles({
    name: "rubric.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7\nfixture\n%%EOF"),
  });
  const generate = page.getByRole("button", {
    name: "Generate Rubrik Digital via AI",
  });
  await generate.click();
  await expect(
    page.getByText("Layanan AI sedang sibuk. Coba lagi."),
  ).toBeVisible();
  await expect(title).toHaveValue("Draf manual saya");
  expect(requests).toBe(1);
  await generate.click();
  const use = page.getByRole("button", {
    name: "Gunakan hasil dan ganti isi form",
  });
  await expect(use).toBeVisible();
  await expect(title).toHaveValue("Draf manual saya");
  await use.click();
  await expect(title).toHaveValue(rubric.title);
  await expect(
    page.getByRole("textbox", {
      name: "Indikator bukti kriteria 1 ke 1",
      exact: true,
    }),
  ).toHaveValue("Indikator lengkap pelayanan kamar. ".repeat(80));
  await expect(
    page.getByRole("button", { name: "Simpan Rubrik Digital", exact: true }),
  ).toBeEnabled();
});
