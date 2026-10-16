import { test, expect } from "@playwright/test";
import { actors } from "./fixtures";
test("select active rubric versions, edit/delete old drafts, and serialize publish versus delete", async () => {
  const fixture = await actors();
  const { assessor, outsider, student } = fixture;
  const input = {
    title: "Versi awal",
    description: "Tujuan awal",
    criteria: [
      {
        code: "TEST",
        title: "Persiapan",
        description: "Persiapan terlihat",
        order: 1,
        required: true,
        maxScore: 100,
      },
    ],
  };
  try {
    const created = await assessor.context.post("/api/v1/rubrics", {
      data: input,
    });
    expect(created.status()).toBe(201);
    const id = (await created.json()).data.id;
    const base = `/api/v1/rubrics/${id}`;
    const detail = async () =>
      (await (await assessor.context.get(base)).json()).data;
    const create = async () => {
      const r = await assessor.context.post(`${base}/versions`);
      expect(r.status()).toBe(201);
      return (await r.json()).data;
    };
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: "{",
          headers: { "Content-Type": "application/json" },
        })
      ).status(),
    ).toBe(400);
    const v1 = (await detail()).versions[0];
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: { versionId: v1.id },
        })
      ).status(),
    ).toBe(200);
    const firstPublished = (await detail()).versions[0].publishedAt;
    const v2 = await create();
    const v3 = await create();
    expect((await detail()).activeVersionId).toBe(v1.id);
    expect((await detail()).status).toBe("PUBLISHED");
    const visible = await student.context.get(base);
    expect(visible.status()).toBe(200);
    expect(
      (await visible.json()).data.versions.map((v: { id: string }) => v.id),
    ).toEqual([v1.id]);
    expect(
      (
        await outsider.context.put(`${base}/versions/${v2.id}`, { data: input })
      ).status(),
    ).toBe(403);
    await fixture.pool.query("update users set role='ASSESSOR' where id=$1", [
      outsider.id,
    ]);
    expect(
      (await outsider.context.delete(`${base}/versions/${v2.id}`)).status(),
    ).toBe(404);
    expect(
      (
        await assessor.context.put(`${base}/versions/${v2.id}`, {
          data: { ...input, title: "Edit draf lama" },
        })
      ).status(),
    ).toBe(200);
    expect((await detail()).title).toBe(input.title);
    expect(
      (await assessor.context.delete(`${base}/versions/${v2.id}`)).status(),
    ).toBe(200);
    expect((await detail()).activeVersionId).toBe(v1.id);
    expect(
      (
        await assessor.context.put(`${base}/versions/${v3.id}`, {
          data: { ...input, title: "Versi tiga" },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: { versionId: v3.id },
        })
      ).status(),
    ).toBe(200);
    expect((await detail()).title).toBe("Versi tiga");
    expect(
      (
        await assessor.context.put(`${base}/versions/${v3.id}`, { data: input })
      ).status(),
    ).toBe(409);
    expect(
      (await assessor.context.delete(`${base}/versions/${v3.id}`)).status(),
    ).toBe(409);
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: { versionId: v1.id },
        })
      ).status(),
    ).toBe(200);
    expect((await detail()).activeVersionId).toBe(v1.id);
    expect((await detail()).versions[0].publishedAt).toBe(firstPublished);
    expect((await assessor.context.post(`${base}/archive`)).status()).toBe(200);
    expect((await student.context.get(base)).status()).toBe(404);
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: { versionId: v3.id },
        })
      ).status(),
    ).toBe(200);
    expect((await detail()).activeVersionId).toBe(v3.id);
    const v4 = await create();
    const race = await Promise.all([
      assessor.context.post(`${base}/publish`, { data: { versionId: v4.id } }),
      assessor.context.delete(`${base}/versions/${v4.id}`),
    ]);
    expect(race.filter((r) => r.status() === 200)).toHaveLength(1);
    expect(race.filter((r) => [404, 409].includes(r.status()))).toHaveLength(1);
    const final = await detail();
    expect(
      final.versions.some(
        (v: { id: string; publishedAt: string | null }) =>
          v.id === final.activeVersionId && v.publishedAt,
      ),
    ).toBe(true);
    expect(
      (await assessor.context.delete(`${base}/versions/not-a-uuid`)).status(),
    ).toBe(400);
    expect(
      (
        await assessor.context.post(`${base}/publish`, {
          data: { versionId: "invalid" },
        })
      ).status(),
    ).toBe(400);
  } finally {
    await fixture.cleanup();
  }
});
