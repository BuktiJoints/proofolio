import { ApiError } from "@/server/http";

export function assertVideoLimits(
  sizeBytes: number,
  durationMs: number,
  limits: { maxBytes: number; maxSeconds: number },
) {
  if (sizeBytes > limits.maxBytes) {
    throw new ApiError(
      413,
      "FILE_TOO_LARGE",
      `Ukuran video melebihi batas ${Math.round(limits.maxBytes / 1024 / 1024)} MiB.`,
      { sizeBytes, maxBytes: limits.maxBytes },
    );
  }
  if (durationMs > limits.maxSeconds * 1000) {
    const seconds = new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 3,
    }).format(durationMs / 1000);
    throw new ApiError(
      413,
      "VIDEO_TOO_LONG",
      `Durasi video ${seconds} detik melebihi batas ${limits.maxSeconds} detik. Potong video lalu unggah ulang.`,
      { durationMs, maxDurationMs: limits.maxSeconds * 1000 },
    );
  }
}
