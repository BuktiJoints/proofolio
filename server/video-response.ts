import type { CurrentUser } from "@/server/auth";
import { accessibleSubmission } from "@/server/domain/submissions";
import { getVideo } from "@/server/integrations/storage";

export async function videoResponse(id: string, user: CurrentUser, range: string | null) {
  const submission = await accessibleSubmission(id, user); const object = await getVideo(submission.objectKey, range ?? undefined);
  if (!object.Body) return new Response(null, { status: 404 });
  const headers = new Headers({ "Content-Type": submission.mimeType, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store" });
  if (object.ContentLength !== undefined) headers.set("Content-Length", String(object.ContentLength)); if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
  return new Response(object.Body.transformToWebStream() as ReadableStream, { status: range ? 206 : 200, headers });
}
