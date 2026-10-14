import { describe, expect, it } from "vitest";
import { normalizedScore } from "@/server/domain/scoring";
import { assertTransition } from "@/server/domain/states";
import { aiResultSchema, normalizeAiResult } from "@/server/integrations/gemini";
import { hashToken } from "@/server/domain/shares";

describe("domain rules", () => {
  it("normalizes a weighted score to two decimals", () => expect(normalizedScore([{ criterionId: "a", score: 20, maxScore: 30, required: true }, { criterionId: "b", score: 35, maxScore: 40, required: true }])).toBe(78.57));
  it("rejects scores beyond the rubric", () => expect(() => normalizedScore([{ criterionId: "a", score: 31, maxScore: 30, required: true }])).toThrow("rentang"));
  it("enforces submission transitions", () => { expect(() => assertTransition("QUEUED", "ANALYZING")).not.toThrow(); expect(() => assertTransition("QUEUED", "COMPLETED")).toThrow(); });
  it("validates structured AI evidence", () => expect(aiResultSchema.parse({ criteria: [{ criterionId: crypto.randomUUID(), status: "UNCERTAIN", startMs: null, endMs: null, evidence: "Tidak tampak", evidenceQuality: "OCCLUDED" }] }).criteria).toHaveLength(1));
  it("normalizes missing, duplicate, unknown, and invalid timestamp evidence", () => {
    const first = crypto.randomUUID();
    const second = crypto.randomUUID();
    const result = normalizeAiResult({ criteria: [
      { criterionId: first, status: "OBSERVED", startMs: 100, endMs: null, evidence: "Satu", evidenceQuality: "CLEAR" },
      { criterionId: first, status: "OBSERVED", startMs: 100, endMs: 200, evidence: "Dua", evidenceQuality: "CLEAR" },
      { criterionId: crypto.randomUUID(), status: "OBSERVED", startMs: 0, endMs: 100, evidence: "Tidak dikenal", evidenceQuality: "CLEAR" },
    ] }, [
      { id: first, code: "A", title: "A", description: "A" },
      { id: second, code: "B", title: "B", description: "B" },
    ], 1000);
    expect(result.criteria).toHaveLength(2);
    expect(result.criteria.map((item) => item.criterionId)).toEqual([first, second]);
    expect(result.criteria.every((item) => item.status === "UNCERTAIN" && item.startMs === null && item.endMs === null && item.evidenceQuality === "OCCLUDED")).toBe(true);
  });
  it("stores only deterministic token hashes", () => { expect(hashToken("secret")).toHaveLength(64); expect(hashToken("secret")).toBe(hashToken("secret")); });
});
