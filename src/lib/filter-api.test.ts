import { afterEach, expect, test, vi } from "vite-plus/test";
import { filterApi } from "./filter-api";
import type { UnitStatus } from "./filter-types";

afterEach(() => vi.unstubAllGlobals());

test("fetches overview and sends separate versioned status updates with cookies", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(new Response("{}", { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetch);
  const unit: UnitStatus = {
    id: "B24",
    response: "consent",
    completion: "pending",
    board_comment: "",
    craftsman_comment: "",
    version: 3,
    updated_at: "2026-10-01T12:00:00Z",
  };
  await filterApi.overview();
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/units",
    expect.objectContaining({ credentials: "include" }),
  );
  fetch.mockResolvedValue(new Response("{}"));
  await filterApi.setResponse(unit, "home");
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/units/B24/response",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ response: "home", version: 3 }),
    }),
  );
  fetch.mockResolvedValue(new Response("{}"));
  await filterApi.setCompletion(unit, "performed");
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/units/B24/completion",
    expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ completion: "performed", version: 3 }),
    }),
  );
  for (const field of ["board_comment", "craftsman_comment"] as const) {
    fetch.mockResolvedValue(new Response("{}"));
    await filterApi.setComment(unit, field, "Hund i bur");
    expect(fetch).toHaveBeenLastCalledWith(
      `/api/units/B24/${field}`,
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify({ [field]: "Hund i bur", version: 3 }),
      }),
    );
  }
});
