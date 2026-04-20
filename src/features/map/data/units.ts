export type BuildingId = "A" | "B" | "C";

export type Apartment = {
  id: string;
  building: BuildingId;
  floor: 1 | 2 | 3;
  label: string;
};

export type Townhouse = {
  id: string;
  building: "C";
  label: string;
};

export type Unit = Apartment | Townhouse;

export const isTownhouse = (u: Unit): u is Townhouse => u.building === "C";

const range = (start: number, count: number) => Array.from({ length: count }, (_, i) => start + i);

const apartment = (building: BuildingId, floor: 1 | 2 | 3, number: number): Apartment => {
  const id = `${building}${floor}${number}`;
  return { id, building, floor, label: id };
};

export const buildingA: Apartment[] = [
  ...range(1, 9).map((n) => apartment("A", 1, n)),
  ...range(1, 8).map((n) => apartment("A", 2, n)),
];

export const buildingB: Apartment[] = [
  ...range(1, 9).map((n) => apartment("B", 1, n)),
  ...range(1, 8).map((n) => apartment("B", 2, n)),
  ...range(1, 6).map((n) => apartment("B", 3, n)),
];

export const buildingC: Townhouse[] = range(1, 7).map((n) => ({
  id: `C${n}`,
  building: "C",
  label: `C${n}`,
}));

export const allUnits: Unit[] = [...buildingA, ...buildingB, ...buildingC];

export const unitsById = new Map<string, Unit>(allUnits.map((u) => [u.id, u]));
