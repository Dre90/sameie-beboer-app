import { expect, test } from "vite-plus/test";
import { allUnits, isLargeUnit, largeUnitIds, unitsById } from "./units";

test("register has 47 unique units", () => {
  expect(allUnits).toHaveLength(47);
  expect(unitsById.size).toBe(47);
});

test("large units are A21, B16–B19, B25–B28 and every third-floor unit", () => {
  expect([...largeUnitIds].sort()).toEqual([
    "A21",
    "B16",
    "B17",
    "B18",
    "B19",
    "B25",
    "B26",
    "B27",
    "B28",
    "B31",
    "B32",
    "B33",
    "B34",
    "B35",
    "B36",
  ]);
  for (const id of largeUnitIds) expect(unitsById.get(id)?.building).toMatch(/^[AB]$/);
  const thirdFloor = allUnits.filter((u) => "floor" in u && u.floor === 3).map((u) => u.id);
  expect(thirdFloor.every(isLargeUnit)).toBe(true);
});

test("isLargeUnit is false for normal apartments, townhouses and unknown ids", () => {
  expect(isLargeUnit("B16")).toBe(true);
  for (const id of ["A11", "A22", "A28", "B11", "B15", "B21", "B24", "C1", "X99"]) {
    expect(isLargeUnit(id)).toBe(false);
  }
});
