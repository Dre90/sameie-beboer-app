import { useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon, MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FloorTabs } from "./components/FloorTabs";
import { MapCanvas } from "./components/MapCanvas";
import { UnitInfo } from "./components/UnitInfo";
import { UnitList } from "./components/UnitList";
import { geometryByFloor } from "./data/geometry";
import { allUnits, unitsById, type Unit } from "./data/units";
import { type UnitToneMap } from "./lib/tone";

type Floor = 1 | 2 | 3;

export type SiteMapProps = {
  /** Optional per-unit tone for color-coding rectangles on the floor plan. */
  unitTone?: UnitToneMap;
  /** Override the contents of the right-side / bottom-sheet info panel. */
  renderUnitInfo?: (unit: Unit) => ReactNode;
  /** Override the outer container className. Defaults to a full-viewport layout. */
  className?: string;
};

export function SiteMap({
  unitTone,
  renderUnitInfo,
  className = "relative h-[calc(100dvh-4rem)] w-full overflow-hidden",
}: SiteMapProps = {}) {
  const [floor, setFloor] = useState<Floor>(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const selected = selectedId ? (unitsById.get(selectedId) ?? null) : null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const unit = unitsById.get(id);
    if (unit && unit.building !== "C" && "floor" in unit) {
      setFloor(unit.floor);
    }
    setListOpen(false);
  };

  const navigate = (direction: -1 | 1) => {
    if (!selectedId) return;
    const idx = allUnits.findIndex((u) => u.id === selectedId);
    if (idx < 0) return;
    const next = allUnits[(idx + direction + allUnits.length) % allUnits.length];
    handleSelect(next.id);
  };

  const selectedIndex = selectedId ? allUnits.findIndex((u) => u.id === selectedId) : -1;
  const renderInfo = renderUnitInfo ?? ((u: Unit) => <UnitInfo unit={u} />);
  const navLabel = selected ? `${selectedIndex + 1} / ${allUnits.length}` : "";

  return (
    <div className={className}>
      {/* Desktop sidebar */}
      <aside className="absolute inset-y-0 left-0 z-10 hidden w-80 flex-col gap-3 border-r border-border bg-background p-3 md:flex">
        <FloorTabs floor={floor} onChange={setFloor} />
        <UnitList selectedId={selectedId} onSelect={handleSelect} currentFloor={floor} />
      </aside>

      {/* Map */}
      <div className={`absolute inset-0 md:left-80 ${selected && isDesktop ? "md:right-96" : ""}`}>
        <MapCanvas
          geometry={geometryByFloor[floor]}
          floor={floor}
          selectedId={selectedId}
          onSelect={handleSelect}
          unitTone={unitTone}
        />
      </div>

      {/* Mobile floating top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start gap-2 p-3 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setListOpen(true)}
          aria-label="Åpne liste"
          className="pointer-events-auto bg-background/90 backdrop-blur"
        >
          <MenuIcon />
        </Button>
        <div className="pointer-events-auto flex-1 rounded-full border border-border bg-background/90 shadow-sm backdrop-blur">
          <FloorTabs floor={floor} onChange={setFloor} />
        </div>
      </div>

      {/* Desktop info panel — right-side sidebar */}
      {selected && isDesktop && (
        <aside className="absolute inset-y-0 right-0 z-10 hidden w-96 flex-col gap-3 overflow-y-auto border-l border-border bg-background p-5 md:flex">
          <PanelNav
            label={navLabel}
            onPrev={() => navigate(-1)}
            onNext={() => navigate(1)}
            onClose={() => setSelectedId(null)}
          />
          <div className="min-w-0 flex-1">{renderInfo(selected)}</div>
        </aside>
      )}

      {/* Mobile list sheet (from left) */}
      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="flex w-[22rem] max-w-[90vw] flex-col gap-3 p-4">
          <SheetHeader className="p-0 pr-10">
            <SheetTitle>Leiligheter</SheetTitle>
          </SheetHeader>
          <div className="pt-2">
            <FloorTabs floor={floor} onChange={setFloor} />
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <UnitList selectedId={selectedId} onSelect={handleSelect} currentFloor={floor} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile info bottom sheet */}
      <Sheet
        open={!!selected && !isDesktop}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl p-5">
          <SheetHeader className="sr-only p-0">
            <SheetTitle>{selected ? `Leilighet ${selected.label}` : "Leilighet"}</SheetTitle>
          </SheetHeader>
          {selected && (
            <PanelNav label={navLabel} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />
          )}
          <div className="overflow-y-auto pt-3">{selected && renderInfo(selected)}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function PanelNav({
  label,
  onPrev,
  onNext,
  onClose,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={onPrev} aria-label="Forrige leilighet">
          <ChevronLeftIcon />
        </Button>
        <span
          className="min-w-12 text-center text-xs tabular-nums text-muted-foreground"
          aria-live="polite"
        >
          {label}
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label="Neste leilighet">
          <ChevronRightIcon />
        </Button>
      </div>
      {onClose && (
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Lukk">
          <XIcon />
        </Button>
      )}
    </div>
  );
}
