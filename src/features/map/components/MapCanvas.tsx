import { useCallback, useEffect, useRef, useState } from "react";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformContext,
  useTransformEffect,
} from "react-zoom-pan-pinch";
import { Button } from "@/components/ui/button";
import { FloorPlan } from "./FloorPlan";
import { type UnitGeometry } from "../data/geometry";
import { type UnitToneMap } from "../lib/tone";
import { MAX_SCALE, MIN_SCALE, nextStop, zoomPreservingCenter } from "../lib/zoom";

type Floor = 1 | 2 | 3;

export function MapCanvas({
  geometry,
  floor,
  selectedId,
  onSelect,
  unitTone,
}: {
  geometry: UnitGeometry;
  floor: Floor;
  selectedId: string | null;
  onSelect: (id: string) => void;
  unitTone?: UnitToneMap;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
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
              unitTone={unitTone}
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
      className="absolute right-3 bottom-3 z-10 flex flex-col items-center gap-1 rounded-2xl border border-border bg-card/95 p-1 shadow-md backdrop-blur"
      aria-label="Zoom-kontroller"
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => stepZoom(1)}
        disabled={atMax}
        aria-label="Zoom inn"
      >
        <PlusIcon />
      </Button>
      <div
        aria-live="polite"
        className="px-1 py-0.5 text-center text-[10px] font-medium tabular-nums text-muted-foreground"
      >
        {pct}%
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => stepZoom(-1)}
        disabled={atMin}
        aria-label="Zoom ut"
      >
        <MinusIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => resetTransform()}
        aria-label="Tilbakestill zoom"
      >
        <MaximizeIcon />
      </Button>
    </div>
  );
}
