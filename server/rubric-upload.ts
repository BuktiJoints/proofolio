import Busboy from "busboy";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ApiError } from "@/server/http";
import { RUBRIC_FILE_MAX_BYTES } from "@/server/domain/rubric-extraction";

export async function readRubricPdf(request: Request): Promise<Buffer> {
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    throw new ApiError(
      415,
      "INVALID_CONTENT_TYPE",
      "Gunakan multipart/form-data",
    );
  if (!request.body)
    throw new ApiError(400, "MISSING_FIELDS", "File rubrik wajib diisi");
  let parser: ReturnType<typeof Busboy>;
  try {
    parser = Busboy({
      headers: Object.fromEntries(request.headers),
      limits: {
        files: 1,
        fileSize: RUBRIC_FILE_MAX_BYTES + 1,
        fields: 1,
        parts: 2,
      },
    });
  } catch {
    throw new ApiError(400, "INVALID_RUBRIC_FILE", "Upload PDF tidak valid");
  }
  const chunks: Buffer[] = [];
  let seen = false;
  let failure: ApiError | undefined;
  parser.on("file", (field, file) => {
    if (field !== "file")
      failure = new ApiError(
        400,
        "MISSING_FIELDS",
        "Gunakan field file untuk dokumen PDF",
      );
    else seen = true;
    file.on("limit", () => {
      failure = new ApiError(
        413,
        "FILE_TOO_LARGE",
        "Ukuran PDF maksimal 10 MiB",
      );
    });
    file.on("data", (chunk: Buffer) => {
      if (!failure) chunks.push(chunk);
    });
  });
  const extra = () => {
    failure ??= new ApiError(
      400,
      "INVALID_RUBRIC_FILE",
      "Unggah tepat satu file PDF",
    );
  };
  parser.on("field", extra);
  parser.on("filesLimit", extra);
  parser.on("partsLimit", extra);
  parser.on("fieldsLimit", extra);
  try {
    let received = 0;
    const bounded = new Transform({
      transform(chunk: Buffer, _, callback) {
        received += chunk.length;
        if (received > RUBRIC_FILE_MAX_BYTES + 65536)
          callback(
            new ApiError(413, "FILE_TOO_LARGE", "Ukuran PDF maksimal 10 MiB"),
          );
        else callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(request.body as never), bounded, parser);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      400,
      "INVALID_RUBRIC_FILE",
      "Upload PDF tidak dapat dibaca",
    );
  }
  if (failure) throw failure;
  if (!seen)
    throw new ApiError(400, "MISSING_FIELDS", "File rubrik wajib diisi");
  return Buffer.concat(chunks);
}
