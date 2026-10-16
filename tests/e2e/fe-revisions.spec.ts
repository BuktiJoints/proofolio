import { test, expect } from "@playwright/test";
import { join } from "node:path";
const id = "11111111-1111-4111-8111-111111111111";
const versionId = "22222222-2222-4222-8222-222222222222";
const draftId = "33333333-3333-4333-8333-333333333333";
const me = {
  user: {
    id: "preview",
    name: "Nadia Putri Rahma",
    email: "preview@example.test",
    role: "STUDENT",
    accessStatus: "ACTIVE",
    image: null,
  },
  profile: {
    nisn: "0081234567",
    phone: "+6281234567890",
    schoolName: "SMK Negeri 1",
    programKeahlian: "Teknik Komputer & Jaringan",
    notificationStatusEnabled: true,
    notificationResultEnabled: true,
  },
};
const version = {
  id: versionId,
  rubricId: id,
  version: 1,
  title: "UKK Perakitan & Konfigurasi Jaringan LAN",
  description:
    "Mendemonstrasikan praktik merakit kabel UTP, pemasangan konektor, dan konfigurasi jaringan lokal sederhana. Kompetensi ini relevan dengan kebutuhan industri dan menjadi bukti pendukung saat melamar magang maupun pekerjaan.",
  partnerName: "Mitra Industri",
  programKeahlian: "Teknik Komputer & Jaringan",
  requirements:
    "Kabel UTP Cat6 (min. 2 m)\nKonektor RJ-45 & crimping tool\nLAN tester\n2 unit PC / laptop",
  publishedAt: "2026-10-15T00:00:00Z",
  updatedAt: "2026-10-15T00:00:00Z",
  criteria: [
    {
      id: "a",
      code: "K3",
      title: "Persiapan Alat & K3",
      description:
        "Menggunakan alat pelindung diri\nMenyiapkan crimping tool, LAN tester, dan kabel UTP\nArea kerja rapi dan aman",
      order: 1,
      required: true,
      maxScore: 15,
    },
    {
      id: "b",
      code: "POTONG",
      title: "Pemotongan & Penyusunan Kabel",
      description: "Pemotongan sesuai urutan",
      order: 2,
      required: true,
      maxScore: 25,
    },
    {
      id: "c",
      code: "CRIMP",
      title: "Crimping Konektor RJ-45",
      description: "Konektor terpasang kuat",
      order: 3,
      required: true,
      maxScore: 25,
    },
    {
      id: "d",
      code: "UJI",
      title: "Pengujian & Konfigurasi",
      description: "Koneksi diuji dengan LAN tester",
      order: 4,
      required: true,
      maxScore: 35,
    },
  ],
};
for (const width of [390, 768, 1440])
  test(`PDF revision screens and assets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let assessor = false;
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({
        json: {
          data: assessor
            ? {
                ...me,
                user: {
                  ...me.user,
                  name: "Drs. Budi Santoso",
                  role: "ASSESSOR",
                },
                assessorProfile: {
                  employeeId: "198203152008011004",
                  institution: "SMK Negeri 1",
                  programKeahlian: "Teknik Komputer & Jaringan",
                },
              }
            : me,
        },
      }),
    );
    const rubric = {
      id,
      title: version.title,
      status: "PUBLISHED",
      activeVersionId: versionId,
      partnerName: version.partnerName,
      programKeahlian: version.programKeahlian,
      versions: [
        version,
        { ...version, id: draftId, version: 2, publishedAt: null },
      ],
    };
    await page.route(`**/api/v1/rubrics/${id}`, (route) =>
      route.fulfill({ json: { data: rubric } }),
    );
    await page.route("**/api/v1/portfolio", (route) =>
      route.fulfill({
        json: {
          data: [
            {
              submission: {
                id,
                rubricVersionId: versionId,
                normalizedScore: "88.00",
                completedAt: "2026-10-15T00:00:00Z",
              },
              rubric: version,
              verifiedCriterionCount: 3,
              shares: [],
            },
          ],
        },
      }),
    );
    await page.route("**/api/v1/portfolio/share", (route) =>
      route.fulfill({ json: { data: null } }),
    );
    await page.route("**/api/v1/dashboard", (route) =>
      route.fulfill({
        json: {
          data: {
            counts: { AWAITING_REVIEW: 3, COMPLETED: 2 },
            recent: [],
            statistics: {
              averageScore: "88",
              completedThisMonth: 2,
              activeRubrics: 3,
            },
          },
        },
      }),
    );
    async function capture(name: string) {
      await page.evaluate(() => document.fonts.ready);
      await expect
        .poll(() =>
          page
            .locator('img[src^="/design/"]')
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  (image as HTMLImageElement).complete &&
                  (image as HTMLImageElement).naturalWidth > 0,
              ),
            ),
        )
        .toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.TEST_SCREENSHOTS)
        await page.screenshot({
          path: join(
            process.env.TEST_SCREENSHOTS,
            `revision-${name}-${width}.png`,
          ),
          fullPage: true,
        });
    }
    await page.goto("/student/dashboard");
    await expect(
      page.getByRole("heading", {
        name: "Halo, Nadia Putri Rahma!",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId("dashboard-banner-decoration"),
    ).toBeAttached();
    await capture("student-dashboard");
    await page.goto(`/student/rubrics/${id}`);
    await expect(
      page.getByRole("heading", { name: version.title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Persyaratan Peralatan", exact: true }),
    ).toBeVisible();
    await capture("student-module");
    await page.goto("/student/profile");
    await expect(
      page.getByRole("heading", { name: "Profil Saya", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("profile-evidence-count")).toHaveText("3");
    await capture("profile");
    await page
      .getByRole("button", { name: "Ubah Password", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await page
      .getByRole("link", { name: "Buka Portofolio Digital", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Daftar Bukti Kompetensi",
        exact: true,
      }),
    ).toBeVisible();
    await capture("portfolio");
    assessor = true;
    await page.goto("/assessor/dashboard");
    await expect(
      page.getByRole("heading", {
        name: "Selamat datang, Drs. Budi Santoso",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByTestId("dashboard-banner-decoration"),
    ).toBeAttached();
    await capture("assessor-dashboard");
    await page.goto(`/assessor/rubrics/${id}`);
    await expect(
      page.getByRole("button", { name: "Edit versi 1", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Edit versi 2", exact: true }),
    ).toBeEnabled();
    await capture("versions");
    await page
      .getByRole("button", { name: "Edit versi 2", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Editor Rubrik Interaktif",
        exact: true,
      }),
    ).toBeVisible();
    await capture("editor");
    await page
      .getByRole("link", { name: "Kembali ke Manajemen Modul", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Buat Draf Baru", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Buat Draf Versi Baru", exact: true }),
    ).toBeVisible();
    await capture("new-version");
    expect(errors).toEqual([]);
  });
