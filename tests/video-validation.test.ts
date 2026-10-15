import { describe, expect, it } from "vitest";
import { assertVideoLimits } from "@/server/domain/video-validation";
const limits = { maxBytes: 100 * 1024 * 1024, maxSeconds: 120 };
describe("video upload limits", () => {
  it("accepts a 3.6 MiB video lasting exactly two minutes", () =>
    expect(() =>
      assertVideoLimits(Math.round(3.6 * 1024 * 1024), 120000, limits),
    ).not.toThrow());
  it("reports the exact duration when a two-minute display hides excess milliseconds", () => {
    try {
      assertVideoLimits(3600000, 120033, limits);
      throw new Error("Expected validation error");
    } catch (error) {
      expect(error).toMatchObject({
        status: 413,
        code: "VIDEO_TOO_LONG",
        fields: { durationMs: 120033, maxDurationMs: 120000 },
      });
      expect((error as Error).message).toContain("120,033");
    }
  });
  it("distinguishes an oversized file from a long video", () => {
    expect(() => assertVideoLimits(limits.maxBytes + 1, 1000, limits)).toThrow(
      "Ukuran",
    );
    expect(() =>
      assertVideoLimits(limits.maxBytes, 1000, limits),
    ).not.toThrow();
  });
});
