import { expect, request, test } from "@playwright/test";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

test("migrated profile schema supports the authenticated me endpoint", async () => {
  const databaseURL = process.env.DATABASE_URL;
  const baseURL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
  if (
    !databaseURL ||
    !["localhost", "127.0.0.1"].includes(new URL(databaseURL).hostname) ||
    !["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname)
  ) {
    throw new Error(
      "Profile regression test requires local web and database services.",
    );
  }
  const pool = new Pool({ connectionString: databaseURL });
  const context = await request.newContext({ baseURL });
  let userId: string | undefined;
  try {
    const columns = await pool.query(
      "select column_name from information_schema.columns where table_schema='public' and table_name='student_profiles'",
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual(
      expect.arrayContaining([
        "nisn",
        "phone",
        "notification_status_enabled",
        "notification_result_enabled",
      ]),
    );
    const run = randomUUID();
    const signup = await context.post("/api/auth/sign-up/email", {
      data: {
        name: "Profile regression",
        email: `profile-${run}@example.test`,
        password: `Test-${run}!`,
      },
    });
    expect(signup.status()).toBe(200);
    userId = (await signup.json()).user.id;
    const initial = await context.get("/api/v1/me");
    expect(initial.status()).toBe(200);
    expect((await initial.json()).data.profile).toBeNull();
    const updated = await context.patch("/api/v1/me/profile", {
      data: {
        name: "Profile regression",
        schoolName: "SMK Pengujian",
        programKeahlian: "Teknik",
        phone: "+6281234567890",
        notificationStatusEnabled: false,
        notificationResultEnabled: true,
      },
    });
    expect(updated.status()).toBe(200);
    const me = await context.get("/api/v1/me");
    expect(me.status()).toBe(200);
    const result = (await me.json()).data.profile;
    expect(result.notificationStatusEnabled).toBe(false);
    expect(result.notificationResultEnabled).toBe(true);
  } finally {
    if (userId) await pool.query("delete from users where id=$1", [userId]);
    await context.dispose();
    await pool.end();
  }
});
