import Busboy from "busboy";
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { spawn } from "node:child_process";
import { fileTypeFromFile } from "file-type";
import { env } from "@/server/env";
import { ApiError } from "@/server/http";

export type ParsedUpload = { rubricVersionId: string; path: string; tempDir: string; filename: string; mime: string; size: number; sha256: string; durationMs: number };
const allowed = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function duration(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const p = spawn("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path]);
    let out = ""; p.stdout.on("data", (d) => out += d); p.on("error", () => reject(new ApiError(503, "FFPROBE_UNAVAILABLE", "Validator video tidak tersedia")));
    p.on("close", (code) => { const seconds = Number(out.trim()); if (code === 0 && Number.isFinite(seconds)) resolve(Math.round(seconds * 1000)); else reject(new ApiError(400, "INVALID_VIDEO", "Video tidak dapat dibaca")); });
  });
}

export async function parseVideoUpload(request: Request): Promise<ParsedUpload> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) throw new ApiError(415, "INVALID_CONTENT_TYPE", "Gunakan multipart/form-data");
  if (!request.body) throw new ApiError(400, "EMPTY_BODY", "Berkas video wajib diisi");
  const tempDir = await mkdtemp(join(tmpdir(), "bukti-")); const path = join(tempDir, "upload");
  const hash = createHash("sha256"); let filename = "video"; let claimedMime = ""; let rubricVersionId = ""; let fileSeen = false;
  const writes: Promise<void>[] = [];
  try {
    await new Promise<void>((resolve, reject) => {
      const bb = Busboy({ headers: Object.fromEntries(request.headers), limits: { files: 1, fileSize: env().UPLOAD_MAX_BYTES, fields: 5 } });
      bb.on("field", (name, value) => { if (name === "rubricVersionId") rubricVersionId = value; });
      bb.on("file", (name, stream, info) => {
        if (name !== "video") { stream.resume(); return; }
        fileSeen = true; filename = info.filename || filename; claimedMime = info.mimeType;
        let exceeded = false; stream.on("limit", () => { exceeded = true; });
        const tee = new Transform({ transform(chunk, _enc, cb) { hash.update(chunk); cb(null, chunk); } });
        writes.push(pipeline(stream, tee, createWriteStream(path)).then(() => { if (exceeded) throw new ApiError(413, "FILE_TOO_LARGE", "Ukuran video melebihi batas"); }));
      });
      bb.on("error", reject); bb.on("close", resolve);
      Readable.fromWeb(request.body as never).pipe(bb);
    });
    await Promise.all(writes);
    if (!fileSeen || !rubricVersionId) throw new ApiError(400, "MISSING_FIELDS", "video dan rubricVersionId wajib diisi");
    const info = await stat(path); const detected = await fileTypeFromFile(path); const mime = detected?.mime ?? claimedMime;
    if (!allowed.has(mime)) throw new ApiError(415, "UNSUPPORTED_VIDEO", "Format video harus MP4, WebM, atau MOV");
    const durationMs = await duration(path);
    if (durationMs > env().UPLOAD_MAX_DURATION_SECONDS * 1000) throw new ApiError(413, "VIDEO_TOO_LONG", "Durasi video melebihi batas");
    return { rubricVersionId, path, tempDir, filename, mime, size: info.size, sha256: hash.digest("hex"), durationMs };
  } catch (error) { await rm(tempDir, { recursive: true, force: true }); throw error; }
}
export async function cleanupUpload(upload: Pick<ParsedUpload, "tempDir">) { await rm(upload.tempDir, { recursive: true, force: true }); }
