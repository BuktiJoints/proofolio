export class ClientApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: unknown,
    public requestId?: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(init.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw new ClientApiError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      typeof error?.message === "string"
        ? error.message
        : "Permintaan gagal. Silakan coba lagi.",
      error?.fields,
      error?.requestId,
    );
  }
  return payload as T;
}
export const jsonBody = (value: unknown) => JSON.stringify(value);
export const errorMessage = (error: unknown) =>
  error instanceof ClientApiError
    ? error.message
    : "Koneksi bermasalah. Silakan coba lagi.";
