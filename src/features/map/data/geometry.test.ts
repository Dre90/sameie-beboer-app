import { expect, test } from "vite-plus/test";
import { geometryByFloor, type Rect, RIGHT_EDGE, VIEW_BOX } from "./geometry";
import { allUnits, isLargeUnit, isTownhouse } from "./units";

const floors = [1, 2, 3] as const;
const area = (r: Rect) => r.w * r.h;
const right = (r: Rect) => r.x + r.w;
const bottom = (r: Rect) => r.y + r.h;
const overlaps = (a: Rect, b: Rect) =>
  a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
const entries = (floor: 1 | 2 | 3, building: string) =>
  Object.entries(geometryByFloor[floor]).filter(([id]) => id.startsWith(building));

test.each(floors)("floor %i draws exactly its apartments plus the townhouses", (floor) => {
  const expected = allUnits.filter((u) => isTownhouse(u) || u.floor === floor).map((u) => u.id);
  expect(Object.keys(geometryByFloor[floor]).sort()).toEqual(expected.sort());
});

test.each(floors)(
  "floor %i has whole-pixel units inside the view box without overlaps",
  (floor) => {
    const all = Object.entries(geometryByFloor[floor]);
    const overlapping: string[] = [];
    for (const [i, [id, rect]] of all.entries()) {
      expect(Object.values(rect).every(Number.isInteger), id).toBe(true);
      expect(rect.x, id).toBeGreaterThanOrEqual(0);
      expect(rect.y, id).toBeGreaterThanOrEqual(0);
      expect(right(rect), id).toBeLessThanOrEqual(VIEW_BOX.width);
      expect(bottom(rect), id).toBeLessThanOrEqual(VIEW_BOX.height);
      for (const [otherId, other] of all.slice(i + 1)) {
        if (overlaps(rect, other)) overlapping.push(`${id}/${otherId}`);
      }
    }
    expect(overlapping).toEqual([]);
  },
);

test.each(floors)("building B and the townhouses share the right edge on floor %i", (floor) => {
  const edge = (building: string) => Math.max(...entries(floor, building).map(([, r]) => right(r)));
  expect(edge("B")).toBe(RIGHT_EDGE);
  expect(edge("C")).toBe(RIGHT_EDGE);
});

test.each(floors)("large units on floor %i are clearly larger than normal units", (floor) => {
  const b = entries(floor, "B");
  const large = b.filter(([id]) => isLargeUnit(id)).map(([, r]) => area(r));
  const normal = b.filter(([id]) => !isLargeUnit(id)).map(([, r]) => area(r));
  expect(large).toHaveLength(floor === 3 ? 6 : 4);
  expect(Math.min(...large)).toBeGreaterThan(1.5 * Math.max(0, ...normal));
  expect(Math.min(...b.map(([, r]) => Math.min(r.w, r.h)))).toBeGreaterThanOrEqual(80);
});

test("A21 spans two rows of the A column and is clearly larger than the other A units", () => {
  const a = entries(2, "A");
  const [, a21] = a.find(([id]) => id === "A21")!;
  const others = a.filter(([id]) => id !== "A21").map(([, r]) => r);
  expect(a21.w).toBe(others[0].w);
  expect(a21.x).toBe(others[0].x);
  expect(area(a21)).toBeGreaterThan(1.5 * Math.max(...others.map(area)));
  expect(a21.h).toBe(2 * others[0].h + 4);
  const lastOther = Math.max(...others.map(bottom));
  expect(a21.y).toBe(lastOther + 4);
});

test("floors 1 and 2 share row height and bottom edge in the A column", () => {
  const f1 = entries(1, "A").map(([, r]) => r);
  const f2 = entries(2, "A").map(([id, r]) => [id, r] as const);
  expect(Math.max(...f2.filter(([id]) => id !== "A21").map(([, r]) => r.h))).toBe(f1[0].h);
  expect(Math.max(...f2.map(([, r]) => bottom(r)))).toBe(Math.max(...f1.map(bottom)));
});

test("A column units on floor 1 are equal and none are large", () => {
  const f1 = entries(1, "A");
  expect(f1.some(([id]) => isLargeUnit(id))).toBe(false);
  expect(new Set(f1.map(([, r]) => r.h)).size).toBe(1);
});

test.each([
  [1, ["B11", "B12", "B13", "B14", "B15"], ["B16", "B17", "B18", "B19"]],
  [2, ["B21", "B22", "B23", "B24"], ["B25", "B26", "B27", "B28"]],
  [3, ["B31", "B32"], ["B33", "B34", "B35", "B36"]],
] as const)("floor %i follows the site plan: strip, then the wing", (floor, strip, wing) => {
  const g = geometryByFloor[floor];
  const [topLeft, topRight, upper, lower] = wing.map((id) => g[id]);
  for (const [i, id] of strip.entries()) {
    expect(g[id].y).toBe(topLeft.y);
    if (i > 0) expect(g[id].x).toBeGreaterThan(right(g[strip[i - 1]]));
  }
  expect(right(g[strip[strip.length - 1]])).toBeLessThan(topLeft.x);
  expect(topRight.y).toBe(topLeft.y);
  expect(topRight.x).toBeGreaterThan(right(topLeft));
  expect(right(topRight)).toBe(RIGHT_EDGE);
  for (const rect of [upper, lower]) {
    expect(rect.x).toBe(topLeft.x);
    expect(right(rect)).toBe(RIGHT_EDGE);
  }
  expect(upper.y).toBeGreaterThan(bottom(topLeft));
  expect(lower.y).toBeGreaterThan(bottom(upper));
});
