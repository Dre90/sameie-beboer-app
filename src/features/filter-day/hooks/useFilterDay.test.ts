import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { filterApi } from "@/lib/filter-api";
import type { Overview } from "@/lib/filter-types";
import { useFilterDay } from "./useFilterDay";

vi.mock("@/lib/filter-api", () => ({ filterApi: { overview: vi.fn() } }));

function deferred<Value>() {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const overview: Overview = {
  units: [
    {
      id: "B24",
      response: "home",
      completion: "pending",
      board_comment: "",
      craftsman_comment: "",
      version: 0,
      updated_at: "2026-09-15T12:00:00Z",
    },
  ],
  eventDate: null,
  fetchedAt: "2026-09-15T12:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(filterApi.overview).mockResolvedValue(overview);
});

test("ignores an older overview when a newer request finishes first", async () => {
  const older = deferred<Overview>();
  vi.mocked(filterApi.overview).mockReturnValueOnce(older.promise);
  const { result } = renderHook(useFilterDay);
  await act(() => result.current.reload());
  expect(result.current.overview).toEqual(overview);
  await act(async () => older.resolve({ ...overview, units: [] }));
  expect(result.current.overview).toEqual(overview);
  expect(result.current.busy).toBe(false);
});

test("ignores failed requests after unmount", async () => {
  const pending = deferred<Overview>();
  vi.mocked(filterApi.overview).mockReturnValueOnce(pending.promise);
  const { result, unmount } = renderHook(useFilterDay);
  unmount();
  await act(async () => pending.reject(new Error("offline")));
  expect(result.current.error).toBe("");
});

test("prevents duplicate writes and refreshes while a save is pending", async () => {
  const { result } = renderHook(useFilterDay);
  await waitFor(() => expect(result.current.busy).toBe(false));
  const savedUnit = { ...overview.units[0], version: 1 };
  const pending = deferred<{ unit: typeof savedUnit }>();
  const operation = vi.fn(() => pending.promise);
  let saving: Promise<void>;
  act(() => {
    saving = result.current.save(operation);
  });
  await act(async () => {
    await result.current.save(operation);
    await result.current.reload();
  });
  expect(operation).toHaveBeenCalledTimes(1);
  expect(filterApi.overview).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve({ unit: savedUnit });
    await saving;
  });
  expect(filterApi.overview).toHaveBeenCalledTimes(2);
  expect(result.current.message).toBe("B24: Lagret");
  expect(result.current.busy).toBe(false);
});

test("blocks writes during load and after failure until a successful refresh", async () => {
  const pending = deferred<Overview>();
  vi.mocked(filterApi.overview).mockReturnValueOnce(pending.promise);
  const { result } = renderHook(useFilterDay);
  const operation = vi.fn();
  await act(() => result.current.save(operation));
  await act(async () => pending.reject(null));
  expect(result.current.error).toBe("Kunne ikke hente status");
  await act(() => result.current.save(operation));
  expect(operation).not.toHaveBeenCalled();
  await act(() => result.current.reload());
  expect(result.current.stale).toBe(false);
  expect(result.current.error).toBe("");
});
