import { test, expect } from "@playwright/test";

// Browser regression: these pages share one QueryClient during client navigation.
// HTTP payloads are controlled here; API ownership is covered by api-contract.spec.
for (const populated of [false, true]) {
  test(`profile ↔ portfolio keeps a consistent cache (${populated ? "completed result" : "empty"})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({
        json: {
          data: {
            user: {
              id: "test-student",
              name: "Siswa Navigasi",
              email: "navigation@example.test",
              role: "STUDENT",
              accessStatus: "ACTIVE",
              image: null,
            },
            profile: {
              nisn: "1234567890",
              phone: "+6281234567890",
              schoolName: "SMK Pengujian",
              programKeahlian: "Teknik",
              notificationStatusEnabled: true,
            },
          },
        },
      }),
    );
    await page.route("**/api/v1/portfolio", (route) =>
      route.fulfill({
        json: {
          data: populated
            ? [
                {
                  submission: {
                    id: "11111111-1111-4111-8111-111111111111",
                    normalizedScore: "88.00",
                    completedAt: "2026-10-15T00:00:00Z",
                  },
                  rubric: {
                    title: "Praktik Navigasi",
                    partnerName: "SMK Pengujian",
                  },
                  shares: [],
                },
              ]
            : [],
        },
      }),
    );
    await page.route("**/api/v1/portfolio/share", (route) =>
      route.fulfill({ json: { data: null } }),
    );
    await page.goto("/student/profile");
    await expect(page.getByTestId("profile-video-count")).toHaveText(
      populated ? "1" : "0",
    );
    for (let visit = 0; visit < 2; visit++) {
      await page
        .getByRole("link", {
          name: "Buka Portofolio Digital",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: "Daftar Bukti Kompetensi",
          exact: true,
        }),
      ).toBeVisible();
      if (populated)
        await expect(
          page
            .locator('[data-slot="card-title"]')
            .filter({ hasText: "Praktik Navigasi" }),
        ).toBeVisible();
      else
        await expect(
          page.getByText("Portofolio belum memiliki hasil", { exact: true }),
        ).toBeVisible();
      await page.getByRole("link", { name: "Profil", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Profil Saya", exact: true }),
      ).toBeVisible();
      await expect(page.getByTestId("profile-video-count")).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
