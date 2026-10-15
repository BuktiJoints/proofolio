import { z } from "zod";
import { rubricInput } from "./rubrics";
import { ApiError } from "@/server/http";

export type RubricDraft = z.infer<typeof rubricInput>;
export const RUBRIC_FILE_MAX_BYTES = 10 * 1024 * 1024;
export const RUBRIC_EXTRACTION_TIMEOUT_MS = 60_000;

export function validateRubricPdf(bytes: Buffer) {
  if (!bytes.length)
    throw new ApiError(400, "INVALID_RUBRIC_FILE", "PDF tidak boleh kosong");
  if (bytes.length > RUBRIC_FILE_MAX_BYTES)
    throw new ApiError(413, "FILE_TOO_LARGE", "Ukuran PDF maksimal 10 MiB");
  if (
    bytes.subarray(0, 5).toString() !== "%PDF-" ||
    !bytes.subarray(-1024).toString().includes("%%EOF")
  ) {
    throw new ApiError(
      415,
      "UNSUPPORTED_RUBRIC_FILE",
      "Unggah dokumen PDF yang valid",
    );
  }
}

export async function extractRubricDraft(
  bytes: Buffer,
  generate: (bytes: Buffer, signal: AbortSignal) => Promise<unknown>,
  timeoutMs = RUBRIC_EXTRACTION_TIMEOUT_MS,
) {
  validateRubricPdf(bytes);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const output = await Promise.race([
      generate(bytes, controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(
            new ApiError(
              503,
              "RUBRIC_EXTRACTION_TIMEOUT",
              "Ekstraksi terlalu lama. Coba lagi atau isi rubrik secara manual.",
            ),
          );
        }, timeoutMs);
      }),
    ]);
    const parsed = rubricInput.safeParse(output);
    if (!parsed.success)
      throw new ApiError(
        503,
        "RUBRIC_EXTRACTION_INVALID",
        "Hasil ekstraksi belum lengkap. Coba dokumen lain atau isi rubrik secara manual.",
      );
    return {
      draft: { ...parsed.data, description: parsed.data.description ?? null },
      simulated: process.env.FAKE_AI === "true",
      requiresHumanReview: true as const,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      "RUBRIC_EXTRACTION_FAILED",
      "Ekstraksi rubrik gagal. Coba lagi atau isi rubrik secara manual.",
    );
  } finally {
    if (timer) clearTimeout(timer);
    controller.abort();
  }
}
