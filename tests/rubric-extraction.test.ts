import { describe, expect, it } from "vitest";
import {
  extractRubricDraft,
  validateRubricPdf,
  RUBRIC_FILE_MAX_BYTES,
} from "@/server/domain/rubric-extraction";
import { readRubricPdf } from "@/server/rubric-upload";
const pdf = Buffer.from("%PDF-1.7\nfixture\n%%EOF");
const draft = {
  title: "Praktik K3",
  criteria: [
    {
      code: "APD",
      title: "Memakai APD",
      description: "APD terlihat digunakan",
      order: 1,
      required: true,
      maxScore: 30,
    },
  ],
};
describe("rubric PDF extraction", () => {
  it("returns validated suggestions requiring human review", async () => {
    expect(await extractRubricDraft(pdf, async () => draft)).toMatchObject({
      draft,
      requiresHumanReview: true,
    });
  });
  it("normalizes an omitted optional description for frontend editing", async () => {
    const result = await extractRubricDraft(pdf, async () => draft);
    expect(result.draft.description).toBeNull();
  });
  it("preserves long component indicators without truncation, with a bounded limit", async () => {
    const description = "Indikator pelayanan kamar.\n".repeat(100);
    const result = await extractRubricDraft(pdf, async () => ({
      ...draft,
      criteria: [{ ...draft.criteria[0], description }],
    }));
    expect(result.draft.criteria[0].description).toBe(description.trim());
    await expect(
      extractRubricDraft(pdf, async () => ({
        ...draft,
        criteria: [{ ...draft.criteria[0], description: "x".repeat(8001) }],
      })),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_INVALID" });
  });
  it("does not trust a PDF extension or claimed MIME", () =>
    expect(() => validateRubricPdf(Buffer.from("not a PDF"))).toThrow("PDF"));
  it("rejects oversized files", () =>
    expect(() =>
      validateRubricPdf(Buffer.alloc(RUBRIC_FILE_MAX_BYTES + 1)),
    ).toThrow("10 MiB"));
  it("rejects empty criteria and duplicate codes from provider", async () => {
    await expect(
      extractRubricDraft(pdf, async () => ({ ...draft, criteria: [] })),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_INVALID" });
    await expect(
      extractRubricDraft(pdf, async () => ({
        ...draft,
        criteria: [draft.criteria[0], draft.criteria[0]],
      })),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_INVALID" });
  });
  it("times out and aborts the provider", async () => {
    let signal: AbortSignal | undefined;
    await expect(
      extractRubricDraft(
        pdf,
        async (_, s) => {
          signal = s;
          return new Promise(() => {});
        },
        10,
      ),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_TIMEOUT" });
    expect(signal?.aborted).toBe(true);
  });
  it("hides provider errors", async () => {
    await expect(
      extractRubricDraft(pdf, async () => {
        throw new Error("private provider details");
      }),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_FAILED" });
  });
  it("reads a bounded multipart upload", async () => {
    const form = new FormData();
    form.set("file", new Blob([pdf], { type: "text/plain" }), "rubric.pdf");
    expect(
      await readRubricPdf(
        new Request("http://localhost", { method: "POST", body: form }),
      ),
    ).toEqual(pdf);
  });
  it("rejects multiple files and wrong field names", async () => {
    const form = new FormData();
    form.append("file", new Blob([pdf]), "one.pdf");
    form.append("file", new Blob([pdf]), "two.pdf");
    await expect(
      readRubricPdf(
        new Request("http://localhost", { method: "POST", body: form }),
      ),
    ).rejects.toMatchObject({ code: "INVALID_RUBRIC_FILE" });
  });
});

describe("multipart bounds", () => {
  it("accepts exactly 10 MiB and rejects a larger body", async () => {
    const bytes = Buffer.alloc(RUBRIC_FILE_MAX_BYTES, 32);
    bytes.write("%PDF-1.7");
    bytes.write("%%EOF", bytes.length - 5);
    const form = new FormData();
    form.set("file", new Blob([bytes]), "rubric.pdf");
    expect(
      (
        await readRubricPdf(
          new Request("http://localhost", { method: "POST", body: form }),
        )
      ).length,
    ).toBe(RUBRIC_FILE_MAX_BYTES);
    const tooLarge = new FormData();
    tooLarge.set(
      "file",
      new Blob([Buffer.alloc(RUBRIC_FILE_MAX_BYTES + 1)]),
      "rubric.pdf",
    );
    await expect(
      readRubricPdf(
        new Request("http://localhost", { method: "POST", body: tooLarge }),
      ),
    ).rejects.toMatchObject({ code: "FILE_TOO_LARGE" });
  });
  it("rejects a wrong field name without trusting the filename", async () => {
    const form = new FormData();
    form.set("video", new Blob([pdf]), "rubric.pdf");
    await expect(
      readRubricPdf(
        new Request("http://localhost", { method: "POST", body: form }),
      ),
    ).rejects.toMatchObject({ code: "MISSING_FIELDS" });
  });
});

describe("safe extraction dependency errors", () => {
  it.each([429, 503])(
    "reports temporary provider status %i without leaking details",
    async (status) => {
      await expect(
        extractRubricDraft(pdf, async () => {
          throw Object.assign(new Error("private"), { status });
        }),
      ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_BUSY", status: 503 });
    },
  );
  it.each([401, 403, 404])(
    "reports provider access/configuration status %i safely",
    async (status) => {
      await expect(
        extractRubricDraft(pdf, async () => {
          throw Object.assign(new Error("private"), { status });
        }),
      ).rejects.toMatchObject({
        code: "RUBRIC_EXTRACTION_UNAVAILABLE",
        status: 503,
      });
    },
  );
  it("maps SDK timeout and malformed JSON to stable errors", async () => {
    await expect(
      extractRubricDraft(pdf, async () => {
        throw new DOMException("private", "TimeoutError");
      }),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_TIMEOUT" });
    await expect(
      extractRubricDraft(pdf, async () => {
        throw new SyntaxError("private");
      }),
    ).rejects.toMatchObject({ code: "RUBRIC_EXTRACTION_INVALID" });
  });
});
