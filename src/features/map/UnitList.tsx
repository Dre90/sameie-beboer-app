import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { allUnits } from "./data/units";

type Floor = 1 | 2 | 3;

const buildingLabels = {
  A: "Bygg A",
  B: "Bygg B",
  C: "Rekkehus C",
} as const;

export function UnitList({
  selectedId,
  onSelect,
  currentFloor,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  currentFloor: Floor;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return allUnits;
    return allUnits.filter((u) => u.id.includes(q));
  }, [query]);

  const grouped = {
    A: filtered.filter((u) => u.building === "A"),
    B: filtered.filter((u) => u.building === "B"),
    C: filtered.filter((u) => u.building === "C"),
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <label className="block">
        <span className="sr-only">Søk etter leilighet</span>
        <Input
          type="search"
          placeholder="Søk (f.eks. B23)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-card p-3">
        {(["A", "B", "C"] as const).map((b) => {
          const items = grouped[b];
          if (items.length === 0) return null;
          return (
            <section key={b} className="flex flex-col gap-2">
              <h3 className="px-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {buildingLabels[b]}
              </h3>
              <ul className="grid grid-cols-3 gap-1.5">
                {items.map((u) => {
                  const onCurrentFloor =
                    u.building === "C" || ("floor" in u && u.floor === currentFloor);
                  const isSelected = u.id === selectedId;
                  return (
                    <li key={u.id}>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => onSelect(u.id)}
                        aria-pressed={isSelected}
                        className={cn("w-full", !onCurrentFloor && "opacity-50")}
                      >
                        {u.label}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <Empty className="p-6">
            <EmptyHeader>
              <EmptyTitle>Ingen treff</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
