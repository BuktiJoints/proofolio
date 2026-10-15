import { z, ZodError } from "zod";
import { unstable_rethrow } from "next/navigation";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: unknown,
  ) {
    super(message);
  }
}
export const ok = <T>(data: T, init?: ResponseInit) =>
  Response.json(
    { data },
    { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } },
  );
export const paged = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
) =>
  Response.json(
    { data, meta: { page, limit, total } },
    { headers: { "Cache-Control": "no-store" } },
  );
export function errorResponse(error: unknown): Response {
  unstable_rethrow(error);
  const requestId = crypto.randomUUID();
  if (error instanceof ApiError)
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          fields: error.fields,
          requestId,
        },
      },
      { status: error.status },
    );
  if (error instanceof ZodError)
    return Response.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Data tidak valid",
          fields: error.flatten(),
          requestId,
        },
      },
      { status: 400 },
    );
  console.error(
    JSON.stringify({
      level: "error",
      requestId,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Terjadi kesalahan internal",
        requestId,
      },
    },
    { status: 500 },
  );
}
export async function route(
  handler: () => Promise<Response>,
): Promise<Response> {
  try {
    return await handler();
  } catch (e) {
    return errorResponse(e);
  }
}
export function pageParams(url: string) {
  const q = new URL(url).searchParams;
  const page = z.coerce
    .number()
    .int()
    .min(1)
    .parse(q.get("page") ?? 1);
  const limit = z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .parse(q.get("limit") ?? 20);
  return { page, limit, offset: (page - 1) * limit };
}
export const uuidParam = (value: string) => z.uuid().parse(value);
