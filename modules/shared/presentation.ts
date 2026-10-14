import type { SubmissionStatus } from "./types";
export const statusLabels: Record<SubmissionStatus, string> = {
  QUEUED: "Menunggu analisis", ANALYZING: "Sedang dianalisis", ANALYSIS_FAILED: "Analisis gagal",
  AWAITING_REVIEW: "Menunggu asesor", IN_REVIEW: "Sedang direview", COMPLETED: "Selesai",
};
export const dateLabel = (value?: string | null) => value ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value)) : "—";
export const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export const pollInterval = (status?: SubmissionStatus) => status === "COMPLETED" || status === "ANALYSIS_FAILED" ? false : 5000;
