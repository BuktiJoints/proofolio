import { test, expect } from "@playwright/test";
const screens = [
  ["/", "Selamat Datang di Platform Verifikasi Kompetensi SMK"],
  ["/login", "Masuk ke Akun Siswa"],
  ["/register", "Buat Akun Siswa Baru"],
  ["/assessor/login", "Masuk ke Akun Asesor / Guru"],
  ["/assessor/register", "Pendaftaran Akun Asesor / Penguji UKK"],
] as const;
for (const width of [390, 768, 1440])
  test(`public Figma screens at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.name));
    for (const [path, title] of screens) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (process.env.TEST_SCREENSHOTS)
        await page.screenshot({
          path: `${process.env.TEST_SCREENSHOTS}/${path === "/" ? "landing" : path.slice(1).replaceAll("/", "-")}-${width}.png`,
          fullPage: true,
        });
    }
    await page.goto("/");
    expect(
      await page
        .locator('img[src^="/design/"]')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete &&
              (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });
