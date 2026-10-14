import { ApiError } from "@/server/http";

const transitions: Record<string, string[]> = {
  QUEUED: ["ANALYZING"], ANALYZING: ["AWAITING_REVIEW", "ANALYSIS_FAILED"], ANALYSIS_FAILED: ["QUEUED"],
  AWAITING_REVIEW: ["IN_REVIEW"], IN_REVIEW: ["COMPLETED"], COMPLETED: [],
};
export function assertTransition(from: string, to: string) {
  if (!transitions[from]?.includes(to)) throw new ApiError(409, "INVALID_STATUS_TRANSITION", `Status ${from} tidak dapat diubah menjadi ${to}`);
}
