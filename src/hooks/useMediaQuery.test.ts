import { afterEach, expect, test, vi } from "vite-plus/test";
import { act, renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

type Listener = (event: MediaQueryListEvent) => void;

const mockMatchMedia = (initialMatch: boolean) => {
  let listener: Listener | null = null;
  const removeEventListener = vi.fn();
  const mql = {
    matches: initialMatch,
    media: "",
    addEventListener: vi.fn((_: string, cb: Listener) => {
      listener = cb;
    }),
    removeEventListener,
    onchange: null,
    dispatchEvent: () => false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  } as unknown as MediaQueryList;
  window.matchMedia = vi.fn().mockReturnValue(mql);
  return {
    removeEventListener,
    fire: (matches: boolean) => {
      listener?.({ matches } as MediaQueryListEvent);
    },
  };
};

afterEach(() => {
  // @ts-expect-error reset
  delete window.matchMedia;
});

test("returns initial match and updates on change", () => {
  const { fire } = mockMatchMedia(false);
  const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
  expect(result.current).toBe(false);
  act(() => {
    fire(true);
  });
  expect(result.current).toBe(true);
});

test("removes listener on unmount", () => {
  const { removeEventListener } = mockMatchMedia(true);
  const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
  unmount();
  expect(removeEventListener).toHaveBeenCalled();
});
