import { describe, expect, it } from "vitest";
import { reviewPayload } from "@/modules/assessment/review-validation";
import { rubricFormSchema } from "@/modules/rubrics/rubric-validation";
import { isUuid, pollInterval } from "@/modules/shared/presentation";
import { pageParams, uuidParam } from "@/server/http";
import { reviewInput } from "@/server/domain/reviews";
const criterion = {
  id: crypto.randomUUID(),
  code: "K3",
  title: "Prosedur K3",
  description: "Prosedur aman",
  required: true,
  order: 1,
  maxScore: 30,
};
describe("frontend and API input rules", () => {
  it("allows an incomplete draft but rejects an incomplete final review", () => {
    expect(reviewPayload([criterion], {}, "", false).items).toEqual([]);
    expect(() => reviewPayload([criterion], {}, "Baik", true)).toThrow("wajib");
  });
  it("accepts explicit zero and requires final feedback", () => {
    const item = { score: "0", decision: "CONFIRMED" as const, note: "" };
    expect(
      reviewPayload([criterion], { [criterion.id]: item }, "Baik", true)
        .items[0].score,
    ).toBe(0);
    expect(() =>
      reviewPayload([criterion], { [criterion.id]: item }, " ", true),
    ).toThrow("Feedback");
  });
  it("does not send blank optional scores as reviewed items", () =>
    expect(
      reviewPayload([{ ...criterion, required: false }], {}, "Baik", true)
        .items,
    ).toEqual([]));
  it("rejects scores beyond the criterion and fractional scores", () => {
    for (const score of ["31", "-1", "1.5"])
      expect(() =>
        reviewPayload(
          [criterion],
          { [criterion.id]: { score, decision: "ADJUSTED", note: "" } },
          "Baik",
          true,
        ),
      ).toThrow("bilangan bulat");
  });
  it("rejects duplicate review criteria before the database", () => {
    const item = { criterionId: criterion.id, decision: "CONFIRMED", score: 1 };
    expect(
      reviewInput.safeParse({ feedback: "Baik", items: [item, item] }).success,
    ).toBe(false);
  });
  it("stops polling at terminal and failed states", () => {
    expect(pollInterval("COMPLETED")).toBe(false);
    expect(pollInterval("ANALYSIS_FAILED")).toBe(false);
    expect(pollInterval("IN_REVIEW")).toBe(5000);
  });
  it("validates rubric codes before saving", () =>
    expect(
      rubricFormSchema.safeParse({
        title: "Rubrik",
        description: "",
        criteria: [criterion, criterion],
      }).success,
    ).toBe(false));
  it("rejects invalid UUIDs and pagination", () => {
    expect(isUuid("bad-id")).toBe(false);
    expect(() => uuidParam("bad-id")).toThrow();
    for (const query of [
      "page=no",
      "page=0",
      "page=1.5",
      "limit=101",
      "limit=-1",
      "limit=",
    ])
      expect(() => pageParams(`http://localhost?${query}`)).toThrow();
  });
});
