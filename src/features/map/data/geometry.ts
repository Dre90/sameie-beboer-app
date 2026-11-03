export type Rect = { x: number; y: number; w: number; h: number };

export const VIEW_BOX = { width: 1000, height: 700 };

const GAP = 4;

// Building B and the townhouses share this right edge, as on the site plan.
export const RIGHT_EDGE = 940;

// Splits x0..x1 into `count` rects. Rounding is cumulative so the row ends exactly at x1.
const row = (x0: number, x1: number, y: number, h: number, count: number): Rect[] => {
  const unit = (x1 - x0 - (count - 1) * GAP) / count;
  return Array.from({ length: count }, (_, i) => {
    const start = x0 + Math.round(unit * i) + i * GAP;
    const end = x0 + Math.round(unit * (i + 1)) + i * GAP;
    return { x: start, y, w: end - start, h };
  });
};

// Building A — vertical strip on the left
const A_X = 60;
const A_W = 120;
const A_TOP = 40;
const A_BOTTOM = 430;

const aColumn = (count: number): Rect[] => {
  const totalH = A_BOTTOM - A_TOP;
  const h = Math.floor((totalH - (count - 1) * GAP) / count);
  return Array.from({ length: count }, (_, i) => ({
    x: A_X,
    y: A_TOP + i * (h + GAP),
    w: A_W,
    h,
  }));
};

// Building B — L-shape (top-right): a horizontal strip of normal units and a wing on the right.
// The wing holds the large units: two side by side at the top, then two spanning the full
// wing width below the stairwell.
const B_TOP = 40;
const B_BOTTOM = 440;
const B_STRIP_X = 260;
const B_STRIP_H = 90;
const B_WING_UNIT_W = 124;
const B_WING_X = RIGHT_EDGE - 2 * B_WING_UNIT_W - GAP;
const B_WING_TOP_H = 150;
const B_WING_LOWER_Y = B_TOP + B_WING_TOP_H + 8;

const bFloor = (stripCount: number): Rect[] => {
  const lowerH = (B_BOTTOM - B_WING_LOWER_Y - GAP) / 2;
  const wingW = RIGHT_EDGE - B_WING_X;
  return [
    ...row(B_STRIP_X, B_WING_X - GAP, B_TOP, B_STRIP_H, stripCount),
    { x: B_WING_X, y: B_TOP, w: B_WING_UNIT_W, h: B_WING_TOP_H },
    { x: RIGHT_EDGE - B_WING_UNIT_W, y: B_TOP, w: B_WING_UNIT_W, h: B_WING_TOP_H },
    { x: B_WING_X, y: B_WING_LOWER_Y, w: wingW, h: lowerH },
    { x: B_WING_X, y: B_WING_LOWER_Y + lowerH + GAP, w: wingW, h: lowerH },
  ];
};

// Building C — row of 7 townhouses at the bottom.
// Left to right rectangles, but IDs are C1 (rightmost) ... C7 (leftmost).
const cRow = (): Rect[] => row(260, RIGHT_EDGE, 530, 130, 7);

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
  ...mapIds(bIds(1, 9), bFloor(5)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const floor2Geometry: UnitGeometry = {
  ...mapIds(aIds(2, 8), aColumn(8)),
  ...mapIds(bIds(2, 8), bFloor(4)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const floor3Geometry: UnitGeometry = {
  ...mapIds(bIds(3, 6), bFloor(2)),
  ...mapIds(cIdsLeftToRight, cRow()),
};

export const geometryByFloor: Record<1 | 2 | 3, UnitGeometry> = {
  1: floor1Geometry,
  2: floor2Geometry,
  3: floor3Geometry,
};
