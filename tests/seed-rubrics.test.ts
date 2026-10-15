import { describe, expect, it } from "vitest";
import { demoRubrics } from "@/server/seeds/demo-rubrics";
import { rubricInput } from "@/server/domain/rubrics";
describe("demo rubric seed definitions", () => {
  it("provides valid teaching and K3 rubrics with 100 total points", () => {
    for (const definition of demoRubrics) {
      const parsed = rubricInput.parse(definition);
      expect(
        parsed.criteria.reduce((sum, criterion) => sum + criterion.maxScore, 0),
      ).toBe(100);
      expect(
        new Set(parsed.criteria.map((criterion) => criterion.code)).size,
      ).toBe(parsed.criteria.length);
      expect(
        new Set(parsed.criteria.map((criterion) => criterion.order)).size,
      ).toBe(parsed.criteria.length);
    }
  });
  it("separates observable teaching criteria from safety criteria", () => {
    const teaching = demoRubrics.find(
      (rubric) => rubric.title === "Keterampilan Mengajar (Microteaching)",
    )!;
    expect(teaching.criteria.map((criterion) => criterion.code)).toEqual([
      "OPENING",
      "OBJECTIVES",
      "EXPLANATION",
      "INTERACTION",
      "COMMUNICATION",
      "CLOSING",
    ]);
    expect(teaching.criteria.every((criterion) => criterion.required)).toBe(
      true,
    );
  });
});
