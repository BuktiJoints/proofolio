import type {
  Criterion,
  ReviewDecision,
  ReviewItem,
} from "@/modules/shared/types";
export type DraftItem = {
  score: string;
  decision: ReviewDecision;
  note: string;
};
export function reviewPayload(
  criteria: Criterion[],
  draft: Record<string, DraftItem>,
  feedback: string,
  finalize: boolean,
) {
  const items: ReviewItem[] = [];
  for (const criterion of criteria) {
    const item = draft[criterion.id];
    if (!item || !item.score.trim()) {
      if (finalize && criterion.required)
        throw new Error(`Nilai ${criterion.title} wajib diisi.`);
      continue;
    }
    const score = Number(item.score);
    if (!Number.isInteger(score) || score < 0 || score > criterion.maxScore)
      throw new Error(
        `Nilai ${criterion.title} harus berupa bilangan bulat 0–${criterion.maxScore}.`,
      );
    if (item.note.length > 2000)
      throw new Error("Catatan maksimal 2000 karakter.");
    items.push({
      criterionId: criterion.id,
      decision: item.decision,
      score,
      note: item.note.trim(),
    });
  }
  if (feedback.length > 4000)
    throw new Error("Feedback maksimal 4000 karakter.");
  if (finalize && !feedback.trim())
    throw new Error("Feedback wajib diisi sebelum finalisasi.");
  return { feedback: feedback.trim(), items };
}
