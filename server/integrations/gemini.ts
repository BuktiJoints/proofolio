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

export const aiResultSchema = z.object({ criteria: z.array(z.object({
  criterionId: z.string().uuid(), status: z.enum(["OBSERVED", "NOT_OBSERVED", "UNCERTAIN"]),
  startMs: z.number().int().nonnegative().nullable(), endMs: z.number().int().nonnegative().nullable(),
  evidence: z.string().min(1), evidenceQuality: z.enum(["CLEAR", "PARTIAL", "OCCLUDED"]),
})) });
export type AiResult = z.infer<typeof aiResultSchema>;
export type CriterionForAi = { id: string; code: string; title: string; description: string };

export async function analyzeVideo(input: { objectKey: string; mimeType: string; durationMs: number; criteria: CriterionForAi[] }): Promise<AiResult> {
  if (process.env.FAKE_AI === "true") return { criteria: input.criteria.map((c, i) => ({ criterionId: c.id, status: "OBSERVED", startMs: i * 1000, endMs: Math.min(input.durationMs, i * 1000 + 800), evidence: `Simulasi bukti untuk ${c.title}`, evidenceQuality: "CLEAR" })) };
  const e = env(); if (!e.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is required by the worker");
  const dir = await mkdtemp(join(tmpdir(), "bukti-ai-")); const path = join(dir, "video");
  const ai = new GoogleGenAI({ apiKey: e.GEMINI_API_KEY }); let uploadedName: string | undefined;
  try {
    const object = await getVideo(input.objectKey); if (!object.Body) throw new Error("Video object has no body");
    await pipeline(Readable.fromWeb(object.Body.transformToWebStream() as never), createWriteStream(path));
    let file = await ai.files.upload({ file: path, config: { mimeType: input.mimeType } }); uploadedName = file.name;
    while (file.state === "PROCESSING") { await new Promise((resolve) => setTimeout(resolve, 1500)); file = await ai.files.get({ name: file.name! }); }
    if (file.state !== "ACTIVE" || !file.uri || !file.mimeType) throw new Error(`Gemini file state: ${file.state}`);
    const prompt = `Anda adalah asisten asesor praktik. Amati video dan berikan bukti faktual untuk setiap kriteria. Jangan menentukan kelulusan. Jika tidak jelas gunakan UNCERTAIN. Timestamp dalam milidetik dan harus berada antara 0 dan ${input.durationMs}. Kriteria: ${JSON.stringify(input.criteria)}`;
    const response = await ai.models.generateContent({ model: e.GEMINI_MODEL, contents: createUserContent([createPartFromUri(file.uri, file.mimeType), prompt]), config: { responseMimeType: "application/json", responseJsonSchema: { type: "object", properties: { criteria: { type: "array", items: { type: "object", required: ["criterionId", "status", "startMs", "endMs", "evidence", "evidenceQuality"], properties: { criterionId: { type: "string" }, status: { type: "string", enum: ["OBSERVED", "NOT_OBSERVED", "UNCERTAIN"] }, startMs: { type: ["integer", "null"] }, endMs: { type: ["integer", "null"] }, evidence: { type: "string" }, evidenceQuality: { type: "string", enum: ["CLEAR", "PARTIAL", "OCCLUDED"] } } } } }, required: ["criteria"] } as never } });
    const parsed = aiResultSchema.parse(JSON.parse(response.text ?? "{}"));
    const ids = new Set(input.criteria.map((c) => c.id));
    return { criteria: input.criteria.map((criterion) => {
      const found = parsed.criteria.find((x) => x.criterionId === criterion.id);
      if (!found) return { criterionId: criterion.id, status: "UNCERTAIN" as const, startMs: null, endMs: null, evidence: "Model tidak mengembalikan bukti", evidenceQuality: "OCCLUDED" as const };
      if (!ids.has(found.criterionId) || found.startMs !== null && found.endMs !== null && (found.endMs < found.startMs || found.endMs > input.durationMs)) return { ...found, status: "UNCERTAIN" as const, startMs: null, endMs: null };
      return found;
    }) };
  } finally { if (uploadedName) await ai.files.delete({ name: uploadedName }).catch(() => undefined); await rm(dir, { recursive: true, force: true }); }
}
