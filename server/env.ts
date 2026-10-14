import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  BETTER_AUTH_SECRET: z.string().min(32),
  DEFAULT_ORGANIZATION_SLUG: z.string().default("smk-demo"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET: z.string().default("bukti-praktik"),
  S3_FORCE_PATH_STYLE: z.preprocess((value) => typeof value === "string" ? value.toLowerCase() === "true" : value, z.boolean()).default(true),
  GEMINI_API_KEY: z.string().default(""),
  GEMINI_MODEL: z.string().default("gemini-3.7-flash"),
  GEMINI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(300000),
  GEMINI_FILE_PROCESSING_TIMEOUT_MS: z.coerce.number().int().positive().default(180000),
  UPLOAD_MAX_BYTES: z.coerce.number().int().positive().default(104857600),
  UPLOAD_MAX_DURATION_SECONDS: z.coerce.number().positive().default(120),
  WORKER_POLL_MS: z.coerce.number().int().positive().default(2000),
  WORKER_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  WORKER_LEASE_MS: z.coerce.number().int().positive().default(300000),
  WORKER_HEARTBEAT_MS: z.coerce.number().int().positive().default(30000),
  SHARE_TTL_HOURS: z.coerce.number().int().positive().default(168),
  LOG_LEVEL: z.string().default("info"),
});

export type Env = z.infer<typeof schema>;
let cached: Env | undefined;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${z.prettifyError(parsed.error)}`);
  }
  cached = parsed.data;
  return cached;
}
