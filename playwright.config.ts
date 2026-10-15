import { loadEnvConfig } from "@next/env";
import { defineConfig } from "@playwright/test";
loadEnvConfig(process.cwd(), true);
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 180_000,
  expect: { timeout: 30_000 },
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL ?? "http://localhost:3000",
    actionTimeout: 30_000,
    navigationTimeout: 45_000,
    trace: "off",
    video: "off",
    screenshot: "off",
  },
});
