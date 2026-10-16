import { it, expect, vi } from "vitest";
vi.mock("@/server/env", () => ({
  env: () => ({
    ...process.env,
    GEMINI_API_KEY: "test-placeholder",
    GEMINI_RUBRIC_MODEL: "gemini-2.5-flash",
  }),
}));
import { generateRubricFromPdf } from "@/server/integrations/rubric-extraction";
import { extractRubricDraft } from "@/server/domain/rubric-extraction";

it("preserves real SDK HTTP status, performs one request and returns a safe busy error", async () => {
  vi.stubEnv("FAKE_AI", "false");
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({
          error: {
            code: 503,
            status: "UNAVAILABLE",
            message: "private provider detail",
          },
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
  );
  vi.stubGlobal("fetch", fetch);
  try {
    await expect(
      extractRubricDraft(
        Buffer.from("%PDF-1.7\nfixture\n%%EOF"),
        generateRubricFromPdf,
      ),
    ).rejects.toMatchObject({
      code: "RUBRIC_EXTRACTION_BUSY",
      status: 503,
      message: expect.not.stringContaining("private"),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
