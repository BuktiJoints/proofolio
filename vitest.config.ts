import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({ test: { environment: "node", include: ["tests/**/*.test.ts"], env: { DATABASE_URL: "postgresql://test:test@localhost:5432/test", BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters", S3_ENDPOINT: "http://localhost:9000", S3_ACCESS_KEY_ID: "test", S3_SECRET_ACCESS_KEY: "test" } }, resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } } });
