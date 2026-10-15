import { expect, test } from "@playwright/test";

for (const width of [390, 768, 1280]) {
  test(`design system typography, colors, and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/design-system");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { name: "Fondasi dan komponen UI" })).toBeVisible();
    await expect(page.getByTestId("bg-primary-20")).toHaveCSS("background-color", "rgb(225, 236, 255)");
    await expect(page.getByTestId("bg-secondary-30")).toHaveCSS("background-color", "rgb(214, 195, 221)");
    await expect(page.getByTestId("bg-tertiary-30")).toHaveCSS("background-color", "rgb(186, 201, 230)");
    await expect(page.getByTestId("bg-neutral-100")).toHaveCSS("background-color", "rgb(24, 27, 32)");
    await expect(page.getByTestId("bg-red-70")).toHaveCSS("background-color", "rgb(217, 42, 42)");
    await expect(page.getByTestId("bg-yellow-50")).toHaveCSS("background-color", "rgb(238, 195, 28)");
    await expect(page.getByTestId("bg-green-70")).toHaveCSS("background-color", "rgb(5, 137, 62)");
    await expect(page.getByTestId("text-h3")).toHaveCSS("font-family", /sora/i);
    await expect(page.getByTestId("text-h3")).toHaveCSS("font-size", "36px");
    await expect(page.getByTestId("text-h3")).toHaveCSS("line-height", "40px");
    await expect(page.getByTestId("text-h3")).toHaveCSS("font-weight", "700");
    await expect(page.getByTestId("text-s2")).toHaveCSS("font-family", /poppins/i);
    await expect(page.getByTestId("text-s2")).toHaveCSS("font-size", "48px");
    await expect(page.getByTestId("text-s2")).toHaveCSS("font-weight", "600");
    await expect(page.getByTestId("text-b4")).toHaveCSS("font-size", "30px");
    await expect(page.getByTestId("text-b4")).toHaveCSS("font-weight", "400");
    await expect(page.getByTestId("button-default")).toHaveCSS("height", width < 768 ? "44px" : "48px");
    await expect(page.getByTestId("button-default")).toHaveCSS("font-weight", "600");
    await expect(page.getByTestId("button-default")).toHaveCSS("font-size", width < 768 ? "14px" : "16px");
    await expect(page.getByTestId("button-default")).toHaveCSS("border-radius", width < 768 ? "12px" : "16px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.TEST_SCREENSHOTS) {
      await page.screenshot({ path: `${process.env.TEST_SCREENSHOTS}/design-system-${width}.png`, fullPage: true });
    }
  });
}

test("shadcn controls retain keyboard, selection, validation, file input, and overlay behavior", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/design-system");
  const primary = page.getByTestId("button-default");
  await primary.hover();
  await expect(primary).toHaveCSS("background-color", "rgb(225, 236, 255)");
  await expect(primary).toHaveCSS("color", "rgb(33, 78, 177)");
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toBeDisabled();
  const name = page.getByRole("textbox", { name: "Nama lengkap" });
  await name.focus();
  await name.fill("Siswa contoh");
  await expect(name).toHaveValue("Siswa contoh");
  await expect(name).toHaveCSS("border-color", "rgb(33, 78, 177)");
  await expect(page.getByRole("textbox", { name: "Field nonaktif" })).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "NISN" })).toHaveAttribute("aria-describedby", "ds-error-message");
  await page.getByRole("combobox", { name: "Rubrik" }).click();
  await page.getByRole("option", { name: "Keterampilan mengajar" }).click();
  await expect(page.getByRole("combobox", { name: "Rubrik" })).toContainText("Keterampilan mengajar");
  await expect(page.getByRole("checkbox", { name: "Notifikasi status", exact: true })).toHaveCSS("border-radius", "4px");
  await page.getByRole("checkbox", { name: "Notifikasi status", exact: true }).check();
  await expect(page.getByRole("checkbox", { name: "Notifikasi status", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Asesor", exact: true }).check();
  await expect(page.getByRole("radio", { name: "Asesor", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Video", exact: true }).click();
  await expect(page.getByRole("button", { name: "Video", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator("#ds-video").setInputFiles({ name: "praktik.mp4", mimeType: "video/mp4", buffer: Buffer.from("local file input UI test") });
  await expect(page.getByText("praktik.mp4", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Riwayat", exact: true }).click();
  await expect(page.getByRole("tabpanel", { name: "Riwayat" })).toContainText("Riwayat penilaian praktik.");
  const accordion = page.getByRole("button", { name: "Bagaimana AI membantu penilaian?" });
  await accordion.click();
  await expect(accordion).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByText("AI menemukan calon bukti dari video.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Buka menu", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Opsi nonaktif" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Buka panel", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Buka konfirmasi", exact: true }).click();
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "Batal", exact: true }).click();
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Buka konfirmasi", exact: true }).click();
  await page.getByRole("button", { name: "Simpan", exact: true }).click();
  await expect(page.getByRole("alertdialog")).not.toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Penilaian contoh disimpan." })).toBeVisible();
  expect(errors).toEqual([]);
});
