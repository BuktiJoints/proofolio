import { describe, it, expect, vi } from "vitest";
vi.mock("@/server/env", () => ({ env: () => process.env }));
const mock = vi.hoisted(() => ({ generate: vi.fn(), options: vi.fn() }));
vi.mock("@google/genai", async (original) => ({
  ...(await original<object>()),
  GoogleGenAI: class {
    constructor(options: unknown) {
      mock.options(options);
    }
    models = { generateContent: mock.generate };
  },
}));
import { generateRubricFromPdf } from "@/server/integrations/rubric-extraction";
import { extractRubricDraft } from "@/server/domain/rubric-extraction";

describe("Gemini PDF request", () => {
  it("uses a separate model, bounded single attempt, and provider-compatible schema", async () => {
    vi.stubEnv("FAKE_AI", "false");
    vi.stubEnv("GEMINI_API_KEY", "test-placeholder");
    vi.stubEnv("GEMINI_MODEL", "video-only-model");
    vi.stubEnv("GEMINI_RUBRIC_MODEL", "pdf-only-model");
    const draft = {
      title: "Menyiapkan Kamar",
      criteria: [
        {
          code: "SIAP",
          title: "Persiapan",
          description: "Persiapan diri dan alat",
          order: 1,
          required: true,
          maxScore: 10,
        },
      ],
    };
    mock.generate.mockResolvedValue({ text: JSON.stringify(draft) });
    try {
      const bytes = Buffer.from("%PDF-1.7\nfixture\n%%EOF");
      const result = await extractRubricDraft(bytes, generateRubricFromPdf);
      expect(result.draft.criteria).toEqual(draft.criteria);
      expect(result.simulated).toBe(false);
      expect(mock.generate).toHaveBeenCalledTimes(1);
      expect(mock.options).toHaveBeenCalledWith(
        expect.objectContaining({
          httpOptions: { timeout: 55000 },
        }),
      );
      const request = mock.generate.mock.calls[0][0];
      expect(request.model).toBe("pdf-only-model");
      expect(request.contents[0].parts[0].inlineData).toEqual({
        mimeType: "application/pdf",
        data: bytes.toString("base64"),
      });
      expect(request.config.abortSignal).toBeInstanceOf(AbortSignal);
      expect(request.config.responseJsonSchema).toBeUndefined();
      const schema = JSON.stringify(request.config.responseSchema);
      for (const unsupported of [
        "$schema",
        "minLength",
        "maxLength",
        "additionalProperties",
        "9007199254740991",
      ])
        expect(schema).not.toContain(unsupported);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
