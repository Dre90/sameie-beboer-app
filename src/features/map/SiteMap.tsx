import { useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FloorTabs } from "./components/FloorTabs";
import { MapCanvas } from "./components/MapCanvas";
import { UnitInfo } from "./components/UnitInfo";
import { UnitList } from "./components/UnitList";
import { geometryByFloor } from "./data/geometry";
import { unitsById } from "./data/units";

type Floor = 1 | 2 | 3;

export function SiteMap() {
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

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
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
        <aside className="absolute inset-y-0 right-0 z-10 hidden w-96 flex-col overflow-y-auto border-l border-border bg-background p-5 md:flex">
          <div className="flex items-start justify-between gap-2">
            <UnitInfo unit={selected} />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedId(null)}
              aria-label="Lukk"
            >
              <XIcon />
            </Button>
          </div>
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
          <div className="overflow-y-auto">{selected && <UnitInfo unit={selected} />}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
