/**
 * Lightweight typed fetch wrapper for our API.
 * Throws ApiError on non-2xx responses so consumers can use try/catch.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.status = status;
    this.body = body;
    this.name = "ApiError";
  }
}

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function getFetch(): FetchFn {
  // Allows tests to inject a fetch; falls back to global.
  return globalThis.fetch.bind(globalThis);
}

export async function apiRequest<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");
  const res = await getFetch()(path, { ...init, headers, credentials: "include" });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : res.statusText) || `HTTP ${res.status}`;
    throw new ApiError(res.status, body, message);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
