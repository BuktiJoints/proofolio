import { GoogleGenAI, createPartFromUri, createUserContent } from "@google/genai";
import { z } from "zod";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { env } from "@/server/env";
import { getVideo } from "./storage";

export const aiResultSchema = z.object({
  criteria: z.array(z.object({
    criterionId: z.string().uuid(),
    status: z.enum(["OBSERVED", "NOT_OBSERVED", "UNCERTAIN"]),
    startMs: z.number().int().nonnegative().nullable(),
    endMs: z.number().int().nonnegative().nullable(),
    evidence: z.string().min(1),
    evidenceQuality: z.enum(["CLEAR", "PARTIAL", "OCCLUDED"]),
  })),
});
export type AiResult = z.infer<typeof aiResultSchema>;
export type CriterionForAi = { id: string; code: string; title: string; description: string };

const uncertain = (criterionId: string, evidence: string): AiResult["criteria"][number] => ({
  criterionId,
  status: "UNCERTAIN",
  startMs: null,
  endMs: null,
  evidence,
  evidenceQuality: "OCCLUDED",
});

export function normalizeAiResult(
  parsed: AiResult,
  criteria: CriterionForAi[],
  durationMs: number,
): AiResult {
  const allowed = new Set(criteria.map((criterion) => criterion.id));
  const known = parsed.criteria.filter((item) => allowed.has(item.criterionId));
  return {
    criteria: criteria.map((criterion) => {
      const matches = known.filter((item) => item.criterionId === criterion.id);
      if (matches.length === 0)
        return uncertain(criterion.id, "Model tidak mengembalikan bukti");
      if (matches.length > 1)
        return uncertain(criterion.id, "Model mengembalikan bukti duplikat");
      const found = matches[0];
      const hasStart = found.startMs !== null;
      const hasEnd = found.endMs !== null;
      if (
        hasStart !== hasEnd ||
        (hasStart && hasEnd && (found.startMs! > found.endMs! || found.endMs! > durationMs))
      ) return uncertain(criterion.id, "Timestamp bukti dari model tidak valid");
      return found;
    }),
  };
}

export async function analyzeVideo(input: {
  objectKey: string;
  mimeType: string;
  durationMs: number;
  criteria: CriterionForAi[];
}): Promise<AiResult> {
  if (process.env.FAKE_AI === "true") return {
    criteria: input.criteria.map((criterion, index) => ({
      criterionId: criterion.id,
      status: "OBSERVED",
      startMs: index * 1000,
      endMs: Math.min(input.durationMs, index * 1000 + 800),
      evidence: `Simulasi bukti untuk ${criterion.title}`,
      evidenceQuality: "CLEAR",
    })),
  };
  const config = env();
  if (!config.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required by the worker");
  const directory = await mkdtemp(join(tmpdir(), "bukti-ai-"));
  const path = join(directory, "video");
  const ai = new GoogleGenAI({
    apiKey: config.GEMINI_API_KEY,
    httpOptions: {
      timeout: config.GEMINI_REQUEST_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
    },
  });
  let uploadedName: string | undefined;
  const requestSignal = AbortSignal.timeout(config.GEMINI_REQUEST_TIMEOUT_MS);
  try {
    const object = await getVideo(input.objectKey);
    if (!object.Body) throw new Error("Video object has no body");
    await pipeline(
      Readable.fromWeb(object.Body.transformToWebStream() as never),
      createWriteStream(path),
      { signal: requestSignal },
    );
    let file = await ai.files.upload({
      file: path,
      config: { mimeType: input.mimeType, abortSignal: requestSignal },
    });
    uploadedName = file.name;
    const processingDeadline = Date.now() + config.GEMINI_FILE_PROCESSING_TIMEOUT_MS;
    while (file.state === "PROCESSING") {
      if (Date.now() >= processingDeadline)
        throw new Error("Gemini file processing timed out");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      file = await ai.files.get({
        name: file.name!,
        config: { abortSignal: requestSignal },
      });
    }
    if (file.state !== "ACTIVE" || !file.uri || !file.mimeType)
      throw new Error(`Gemini file state: ${file.state}`);
    const prompt = `Anda adalah asisten asesor praktik. Amati video dan berikan bukti faktual untuk setiap kriteria. Jangan menentukan kelulusan. Jika tidak jelas gunakan UNCERTAIN. Timestamp dalam milidetik dan harus berada antara 0 dan ${input.durationMs}. Kriteria: ${JSON.stringify(input.criteria)}`;
    const response = await ai.models.generateContent({
      model: config.GEMINI_MODEL,
      contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]),
      config: {
        abortSignal: requestSignal,
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          properties: {
            criteria: {
              type: "array",
              items: {
                type: "object",
                required: ["criterionId", "status", "startMs", "endMs", "evidence", "evidenceQuality"],
                properties: {
                  criterionId: { type: "string" },
                  status: { type: "string", enum: ["OBSERVED", "NOT_OBSERVED", "UNCERTAIN"] },
                  startMs: { type: ["integer", "null"] },
                  endMs: { type: ["integer", "null"] },
                  evidence: { type: "string" },
                  evidenceQuality: { type: "string", enum: ["CLEAR", "PARTIAL", "OCCLUDED"] },
                },
              },
            },
          },
          required: ["criteria"],
        } as never,
      },
    });
    const parsed = aiResultSchema.parse(JSON.parse(response.text ?? "{}"));
    return normalizeAiResult(parsed, input.criteria, input.durationMs);
  } finally {
    if (uploadedName)
      await ai.files.delete({ name: uploadedName }).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}
