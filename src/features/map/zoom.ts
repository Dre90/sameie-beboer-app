// Fixed zoom stops. Buttons, scroll wheel and pinch all snap to these.
export const ZOOM_STOPS = [0.6, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const;
export const MIN_SCALE = ZOOM_STOPS[0];
export const MAX_SCALE = ZOOM_STOPS[ZOOM_STOPS.length - 1];

export function nextStop(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    return ZOOM_STOPS.find((s) => s > current + 0.001) ?? MAX_SCALE;
  }
  return [...ZOOM_STOPS].reverse().find((s) => s < current - 0.001) ?? MIN_SCALE;
}

/**
 * Given the current pan/zoom state, compute new position + scale so the
 * viewport center stays locked when zooming to `newScale`.
 */
export function zoomPreservingCenter(
  currentScale: number,
  newScale: number,
  positionX: number,
  positionY: number,
  viewportWidth: number,
  viewportHeight: number,
): { x: number; y: number; scale: number } {
  const cx = viewportWidth / 2;
  const cy = viewportHeight / 2;
  // World-space point currently under the viewport center:
  const wx = (cx - positionX) / currentScale;
  const wy = (cy - positionY) / currentScale;
  return {
    x: cx - wx * newScale,
    y: cy - wy * newScale,
    scale: newScale,
  };
}
