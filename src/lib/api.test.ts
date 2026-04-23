import { describe, expect, test, vi } from "vite-plus/test";
import { ApiError, apiRequest } from "./api";

function mockFetch(response: Response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiRequest", () => {
  test("parses JSON on success", async () => {
    mockFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const body = await apiRequest<{ ok: boolean }>("/api/health");
    expect(body).toEqual({ ok: true });
  });

  test("throws ApiError with message from body on failure", async () => {
    mockFetch(
      new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    try {
      await apiRequest("/api/me");
      throw new Error("should not resolve");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      const err = e as ApiError;
      expect(err.status).toBe(403);
      expect(err.message).toBe("Forbidden");
    }
  });

  test("sets content-type when body provided", async () => {
    const fn = mockFetch(new Response(JSON.stringify({}), { status: 200 }));
    await apiRequest("/api/x", { method: "POST", body: JSON.stringify({ a: 1 }) });
    const call = fn.mock.calls[0];
    const init = call[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  test("falls back to text when body is not JSON", async () => {
    mockFetch(new Response("not json", { status: 500 }));
    try {
      await apiRequest("/api/x");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).body).toBe("not json");
    }
  });
});
