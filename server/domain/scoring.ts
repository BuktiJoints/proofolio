import { ApiError } from "@/server/http";

export type ScoreItem = { criterionId: string; score: number; maxScore: number; required: boolean };
export function normalizedScore(items: ScoreItem[]): number {
  if (!items.length) throw new ApiError(400, "MISSING_REVIEW_ITEMS", "Penilaian belum lengkap");
  for (const item of items) {
    if (!Number.isInteger(item.score) || item.score < 0 || item.score > item.maxScore) throw new ApiError(400, "INVALID_SCORE", "Nilai harus berada dalam rentang kriteria", { criterionId: item.criterionId });
  }
  const max = items.reduce((n, i) => n + i.maxScore, 0);
  if (max <= 0) throw new ApiError(400, "INVALID_RUBRIC", "Total nilai maksimal rubrik harus lebih dari nol");
  return Math.round((items.reduce((n, i) => n + i.score, 0) / max) * 10000) / 100;
}
