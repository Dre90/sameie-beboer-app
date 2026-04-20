import { useState } from "react";
import { Drawer } from "vaul";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { FloorTabs } from "./FloorTabs";
import { MapCanvas } from "./MapCanvas";
import { UnitInfo } from "./UnitInfo";
import { UnitList } from "./UnitList";
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
      <aside className="absolute inset-y-0 left-0 z-10 hidden w-80 flex-col gap-3 border-r border-slate-200 bg-white p-3 md:flex dark:border-slate-800 dark:bg-slate-900">
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
        <button
          type="button"
          onClick={() => setListOpen(true)}
          aria-label="Åpne liste"
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-700 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200"
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
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
          </svg>
        </button>
        <div className="pointer-events-auto flex-1">
          <FloorTabs floor={floor} onChange={setFloor} className="shadow-sm" />
        </div>
      </div>

      {/* Desktop info panel — right-side sidebar */}
      {selected && isDesktop && (
        <aside className="absolute inset-y-0 right-0 z-10 hidden w-96 flex-col overflow-y-auto border-l border-slate-200 bg-white p-5 md:flex dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-2">
            <UnitInfo unit={selected} />
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Lukk"
              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
            >
              ×
            </button>
          </div>
        </aside>
      )}

      {/* Mobile list drawer (from left) */}
      <Drawer.Root
        open={listOpen}
        onOpenChange={setListOpen}
        direction="left"
        shouldScaleBackground={false}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col bg-white p-3 outline-none md:hidden dark:bg-slate-900"
          >
            <Drawer.Title className="sr-only">Leiligheter</Drawer.Title>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Leiligheter</h2>
              <button
                type="button"
                onClick={() => setListOpen(false)}
                aria-label="Lukk"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ×
              </button>
            </div>
            <FloorTabs floor={floor} onChange={setFloor} />
            <div className="mt-3 flex min-h-0 flex-1 flex-col">
              <UnitList selectedId={selectedId} onSelect={handleSelect} currentFloor={floor} />
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Mobile info bottom sheet */}
      <Drawer.Root
        open={!!selected && !isDesktop}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/40 md:hidden" />
          <Drawer.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[85vh] flex-col rounded-t-2xl bg-white p-5 outline-none md:hidden dark:bg-slate-900"
          >
            <Drawer.Title className="sr-only">
              {selected ? `Leilighet ${selected.label}` : "Leilighet"}
            </Drawer.Title>
            <div
              aria-hidden="true"
              className="mx-auto mb-4 h-1.5 w-12 flex-shrink-0 rounded-full bg-slate-300 dark:bg-slate-700"
            />
            <div className="overflow-y-auto">{selected && <UnitInfo unit={selected} />}</div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
