import type { SubmissionStatus } from "@/modules/shared/types";
import { cn } from "@/lib/utils";
export function ProgressTracker({ status }: { status: SubmissionStatus }) {
  const index =
    status === "COMPLETED"
      ? 3
      : status === "IN_REVIEW" || status === "AWAITING_REVIEW"
        ? 2
        : status === "ANALYZING" || status === "ANALYSIS_FAILED"
          ? 1
          : 0;
  return (
    <ol
      aria-label="Tahapan penilaian"
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {["Video terkirim", "Diproses AI", "Ditinjau asesor", "Selesai"].map(
        (label, i) => (
          <li
            key={label}
            aria-current={i === index ? "step" : undefined}
            className={cn(
              "space-y-2 text-b9",
              i <= index ? "text-primary-70" : "text-neutral-60",
            )}
          >
            <div
              className={cn(
                "h-1.5 rounded-full",
                i < index
                  ? "bg-primary-70"
                  : i === index
                    ? "bg-primary-40"
                    : "bg-neutral-30",
              )}
            />
            <span>{label}</span>
          </li>
        ),
      )}
    </ol>
  );
}
