import { expect, test } from "vite-plus/test";
import { MAX_SCALE, MIN_SCALE, ZOOM_STOPS, nextStop, zoomPreservingCenter } from "./zoom";

test("nextStop moves up through integer-friendly stops", () => {
  expect(nextStop(1, 1)).toBe(1.25);
  expect(nextStop(1.25, 1)).toBe(1.5);
  expect(nextStop(1.5, 1)).toBe(2);
});

test("nextStop moves down through integer-friendly stops", () => {
  expect(nextStop(1.5, -1)).toBe(1.25);
  expect(nextStop(1, -1)).toBe(0.75);
  expect(nextStop(0.75, -1)).toBe(0.6);
});

test("nextStop clamps at min and max", () => {
  expect(nextStop(MAX_SCALE, 1)).toBe(MAX_SCALE);
  expect(nextStop(MIN_SCALE, -1)).toBe(MIN_SCALE);
});

test("nextStop snaps to nearest stop when starting between stops", () => {
  expect(nextStop(1.28, 1)).toBe(1.5);
  expect(nextStop(1.28, -1)).toBe(1.25);
});

test("ZOOM_STOPS are sorted ascending and unique", () => {
  const sorted = [...ZOOM_STOPS].sort((a, b) => a - b);
  expect(ZOOM_STOPS).toEqual(sorted as readonly number[]);
  expect(new Set(ZOOM_STOPS).size).toBe(ZOOM_STOPS.length);
});

test("zoomPreservingCenter keeps viewport center locked", () => {
  // Starting scale 1, centered at (0,0) in a 1000x800 viewport.
  const { x, y, scale } = zoomPreservingCenter(1, 2, 0, 0, 1000, 800);
  expect(scale).toBe(2);
  // The world point at viewport center was (500, 400). After zoom it should still be.
  const worldCenterX = (500 - x) / scale;
  const worldCenterY = (400 - y) / scale;
  expect(worldCenterX).toBeCloseTo(500, 5);
  expect(worldCenterY).toBeCloseTo(400, 5);
});

test("zoomPreservingCenter preserves center after pan", () => {
  // Panned so that origin is at (-300, -200) in viewport coords.
  const { x, y, scale } = zoomPreservingCenter(1.5, 0.75, -300, -200, 800, 600);
  const worldCenterBefore = {
    x: (400 - -300) / 1.5,
    y: (300 - -200) / 1.5,
  };
  const worldCenterAfter = {
    x: (400 - x) / scale,
    y: (300 - y) / scale,
  };
  expect(worldCenterAfter.x).toBeCloseTo(worldCenterBefore.x, 5);
  expect(worldCenterAfter.y).toBeCloseTo(worldCenterBefore.y, 5);
});
