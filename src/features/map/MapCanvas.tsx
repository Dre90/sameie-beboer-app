import { useCallback, useEffect, useRef, useState } from "react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformContext,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { FloorPlan } from "./FloorPlan";
import { type UnitGeometry } from "./data/geometry";
import { MAX_SCALE, MIN_SCALE, nextStop, zoomPreservingCenter } from "./zoom";

type Floor = 1 | 2 | 3;

export function MapCanvas({
  geometry,
  floor,
  selectedId,
  onSelect,
}: {
  geometry: UnitGeometry;
  floor: Floor;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TransformWrapper
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        initialScale={1}
        centerOnInit
        wheel={{ disabled: true }}
        doubleClick={{ disabled: true }}
        pinch={{ step: 0.5 }}
        smooth
      >
        <WheelHandler>
          <TransformComponent wrapperClass="!h-full !w-full" contentClass="!h-full !w-full">
            <FloorPlan
              geometry={geometry}
              selectedId={selectedId}
              onSelect={onSelect}
              floor={floor}
            />
          </TransformComponent>
        </WheelHandler>
        <ZoomControls />
      </TransformWrapper>
    </div>
  );
}

/**
 * Snap the zoom to the next fixed stop while keeping the viewport center stable.
 */
function useStepZoom() {
  const { setTransform } = useControls();
  const ctx = useTransformContext();

  return useCallback(
    (direction: 1 | -1) => {
      const state = ctx.state;
      const target = nextStop(state.scale, direction);
      if (Math.abs(target - state.scale) < 0.001) return;

      const wrapper = ctx.wrapperComponent;
      const width = wrapper?.offsetWidth ?? 0;
      const height = wrapper?.offsetHeight ?? 0;

      const { x, y, scale } = zoomPreservingCenter(
        state.scale,
        target,
        state.positionX,
        state.positionY,
        width,
        height,
      );
      setTransform(x, y, scale, 200, "easeOut");
    },
    [ctx, setTransform],
  );
}

function WheelHandler({ children }: { children: React.ReactNode }) {
  const stepZoom = useStepZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWheelAt = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt.current < 120) return;
      lastWheelAt.current = now;
      stepZoom(e.deltaY < 0 ? 1 : -1);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stepZoom]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {children}
    </div>
  );
}

function ZoomControls() {
  const { resetTransform } = useControls();
  const stepZoom = useStepZoom();
  const [scale, setScale] = useState(1);

  useTransformEffect(({ state }) => {
    setScale(state.scale);
  });

  const atMin = scale <= MIN_SCALE + 0.001;
  const atMax = scale >= MAX_SCALE - 0.001;
  const pct = Math.round(scale * 100);

  return (
    <div
      className="absolute right-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
      aria-label="Zoom-kontroller"
    >
      <button
        type="button"
        onClick={() => stepZoom(1)}
        disabled={atMax}
        aria-label="Zoom inn"
        className="flex h-11 w-11 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <div
        aria-live="polite"
        className="border-y border-slate-200 px-1 py-1 text-center text-[10px] font-medium tabular-nums text-slate-600 dark:border-slate-700 dark:text-slate-300"
      >
        {pct}%
      </div>
      <button
        type="button"
        onClick={() => stepZoom(-1)}
        disabled={atMin}
        aria-label="Zoom ut"
        className="flex h-11 w-11 items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => resetTransform()}
        aria-label="Tilbakestill zoom"
        className="flex h-11 w-11 items-center justify-center border-t border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <polyline points="9 3 3 3 3 9" />
          <polyline points="15 3 21 3 21 9" />
          <polyline points="21 15 21 21 15 21" />
          <polyline points="3 15 3 21 9 21" />
        </svg>
      </button>
    </div>
  );
}
