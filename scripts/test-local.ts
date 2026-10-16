import { spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { rm, readFile, writeFile } from "node:fs/promises";
import { Pool } from "pg";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";

// Disposable, isolated services: never run test uploads through the user's real AI worker.
const source = process.env.DATABASE_URL;
const storage = process.env.S3_ENDPOINT;
if (
  !source ||
  !storage ||
  !["localhost", "127.0.0.1"].includes(new URL(source).hostname) ||
  !["localhost", "127.0.0.1"].includes(new URL(storage).hostname)
)
  throw new Error("Local tests require localhost PostgreSQL and MinIO.");
const run = randomBytes(6).toString("hex");
const database = `proofolio_e2e_${run}`;
const bucket = `proofolio-e2e-${run}`;
const distDir = `.next-e2e-${run}`;
const admin = new Pool({ connectionString: source });
const testURL = new URL(source);
testURL.pathname = `/${database}`;
const port = await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.on("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string")
      return reject(new Error("Cannot allocate test port"));
    server.close(() => resolve(address.port));
  });
});
const baseURL = `http://localhost:${port}`;
const testEnv = {
  ...process.env,
  TEST_SCREENSHOTS:
    process.env.TEST_SCREENSHOTS ?? "/tmp/proofolio-main-review",
  DATABASE_URL: testURL.toString(),
  BETTER_AUTH_URL: baseURL,
  FAKE_AI: "true",
  S3_BUCKET: bucket,
  NEXT_DIST_DIR: distDir,
  TEST_BASE_URL: baseURL,
  WORKER_POLL_MS: "500",
  SEED_ASSESSOR_EMAIL: `assessor-${run}@example.test`,
  SEED_ASSESSOR_PASSWORD: `Test-${randomBytes(16).toString("hex")}!`,
};
const originalNextEnv = await readFile("next-env.d.ts", "utf8").catch(
  () => null,
);
const originalTSConfig = await readFile("tsconfig.json", "utf8");
const services: ChildProcess[] = [];
let created = false;
function command(args: string[], visible = false) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn("bun", args, {
      env: testEnv,
      stdio: visible ? "inherit" : "ignore",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Test step failed: ${args[0]} (exit ${code})`)),
    );
  });
}
function service(args: string[], binary = "bun") {
  const child = spawn(binary, args, {
    env: testEnv,
    stdio: "ignore",
    detached: true,
  });
  services.push(child);
  return child;
}
const s3 = new S3Client({
  endpoint: storage,
  region: process.env.S3_REGION ?? "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});
try {
  await admin.query(`CREATE DATABASE "${database}"`);
  created = true;
  console.log("Memeriksa migration dari database kosong dan seed idempotent…");
  await command(["run", "db:migrate"]);
  await command(["run", "db:seed"]);
  await command(["run", "db:seed"]);
  const web = service(
    ["node_modules/next/dist/bin/next", "dev", "--port", String(port)],
    "node",
  );
  service(["run", "worker"]);
  let ready = false;
  for (let i = 0; i < 90; i++) {
    if (web.exitCode !== null) throw new Error("Isolated web server exited");
    try {
      ready = (await fetch(`${baseURL}/api/health/ready`)).ok;
    } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (!ready) throw new Error("Isolated web server did not become ready");
  console.log(
    "Menjalankan pengujian pada database/bucket sementara dengan AI simulasi…",
  );
  const requestedSpecs = process.argv.slice(2);
  if (
    requestedSpecs.some(
      (spec) => !/^tests\/e2e\/[a-z0-9-]+\.spec\.ts$/.test(spec),
    )
  )
    throw new Error("Pass test files under tests/e2e only");
  const specs = requestedSpecs.length
    ? requestedSpecs
    : [
        "tests/e2e/api-contract.spec.ts",
        "tests/e2e/workflow.spec.ts",
        "tests/e2e/wbs-contract.spec.ts",
        "tests/e2e/rubric-versions.spec.ts",
        "tests/e2e/profile-schema.spec.ts",
        "tests/e2e/design-system.spec.ts",
        "tests/e2e/main-design.spec.ts",
        "tests/e2e/fe-revisions.spec.ts",
        "tests/e2e/print-and-dialog.spec.ts",
        "tests/e2e/portfolio-navigation.spec.ts",
      ];
  await command(["x", "playwright", "test", ...specs], true);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Local test failed");
  process.exitCode = 1;
} finally {
  for (const child of services)
    if (child.pid) {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {}
    }
  await Promise.all(
    services.map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => {
            child.once("exit", resolve);
            setTimeout(resolve, 3000);
          }),
    ),
  );
  for (const child of services)
    if (child.pid && child.exitCode === null) {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {}
    }
  try {
    let continuation: string | undefined;
    do {
      const objects = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ContinuationToken: continuation,
        }),
      );
      if (objects.Contents?.length)
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: objects.Contents.map((item) => ({ Key: item.Key! })),
            },
          }),
        );
      continuation = objects.NextContinuationToken;
    } while (continuation);
    await s3.send(new DeleteBucketCommand({ Bucket: bucket }));
  } catch {
    /* Bucket may not have been created if setup failed. */
  }
  s3.destroy();
  if (created) await admin.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  await admin.end();
  await rm(distDir, { recursive: true, force: true });
  if (originalNextEnv !== null)
    await writeFile("next-env.d.ts", originalNextEnv);
  await writeFile("tsconfig.json", originalTSConfig);
  console.log("Lingkungan pengujian sementara dibersihkan.");
}
