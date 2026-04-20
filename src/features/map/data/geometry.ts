export type Rect = { x: number; y: number; w: number; h: number };

export const VIEW_BOX = { width: 1000, height: 700 };

// Building A — vertical strip on the left
const A_X = 60;
const A_W = 120;
const A_TOP = 40;
const A_BOTTOM = 430;

const aColumn = (count: number): Rect[] => {
  const totalH = A_BOTTOM - A_TOP;
  const h = Math.floor((totalH - (count - 1) * 4) / count);
  return Array.from({ length: count }, (_, i) => ({
    x: A_X,
    y: A_TOP + i * (h + 4),
    w: A_W,
    h,
  }));
};

// Building B — L-shape (top-right)
// Top horizontal strip + right vertical strip
const B_TOP_Y = 40;
const B_TOP_H = 90;
const B_RIGHT_X = 720;
const B_RIGHT_W = 120;
const B_HSTRIP_X = 260;
const B_HSTRIP_W = 580;

const bFloor = (top: number, right: number): Rect[] => {
  // Top row: `top` units horizontally across B_HSTRIP
  const topW = Math.floor((B_HSTRIP_W - (top - 1) * 4) / top);
  const topRects: Rect[] = Array.from({ length: top }, (_, i) => ({
    x: B_HSTRIP_X + i * (topW + 4),
    y: B_TOP_Y,
    w: topW,
    h: B_TOP_H,
  }));
  // Right column: `right` units going down
  const rightStartY = B_TOP_Y + B_TOP_H + 8;
  const rightTotalH = 440 - rightStartY;
  const rightH = Math.floor((rightTotalH - (right - 1) * 4) / right);
  const rightRects: Rect[] = Array.from({ length: right }, (_, i) => ({
    x: B_RIGHT_X,
    y: rightStartY + i * (rightH + 4),
    w: B_RIGHT_W,
    h: rightH,
  }));
  return [...topRects, ...rightRects];
};

// Building C — row of 7 townhouses at the bottom
const C_Y = 530;
const C_H = 130;
const C_X = 260;
const C_W = 680;

const cRow = (): Rect[] => {
  const count = 7;
  const w = Math.floor((C_W - (count - 1) * 4) / count);
  // Left to right rectangles, but IDs are C1 (rightmost) ... C7 (leftmost)
  return Array.from({ length: count }, (_, i) => ({
    x: C_X + i * (w + 4),
    y: C_Y,
    w,
    h: C_H,
  }));
};

// Map from id -> rect
export type UnitGeometry = Record<string, Rect>;

const mapIds = (ids: string[], rects: Rect[]): UnitGeometry =>
  Object.fromEntries(ids.map((id, i) => [id, rects[i]]));

const aIds = (floor: 1 | 2, count: number) =>
  Array.from({ length: count }, (_, i) => `A${floor}${count - i}`);

const bIds = (floor: 1 | 2 | 3, count: number) =>
  Array.from({ length: count }, (_, i) => `B${floor}${i + 1}`);

// C1 is rightmost, C7 leftmost. Our rects are left-to-right, so reverse.
const cIdsLeftToRight = ["C7", "C6", "C5", "C4", "C3", "C2", "C1"];

export const floor1Geometry: UnitGeometry = {
  ...mapIds(aIds(1, 9), aColumn(9)),
  ...mapIds(bIds(1, 9), bFloor(7, 2)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const floor2Geometry: UnitGeometry = {
  ...mapIds(aIds(2, 8), aColumn(8)),
  ...mapIds(bIds(2, 8), bFloor(6, 2)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const floor3Geometry: UnitGeometry = {
  ...mapIds(bIds(3, 6), bFloor(4, 2)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const geometryByFloor: Record<1 | 2 | 3, UnitGeometry> = {
  1: floor1Geometry,
  2: floor2Geometry,
  3: floor3Geometry,
};
