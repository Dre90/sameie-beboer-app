import { useMemo, useState } from "react";
import { allUnits } from "./data/units";

type Floor = 1 | 2 | 3;

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
      <label className="relative block">
        <span className="sr-only">Søk etter leilighet</span>
        <input
          type="search"
          inputMode="text"
          placeholder="Søk (f.eks. B23)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-purple-900"
        />
      </label>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        {(["A", "B", "C"] as const).map((b) => {
          const items = grouped[b];
          if (items.length === 0) return null;
          return (
            <section key={b}>
              <h3 className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {b === "A" ? "Bygg A" : b === "B" ? "Bygg B" : "Rekkehus C"}
              </h3>
              <ul className="grid grid-cols-3 gap-1">
                {items.map((u) => {
                  const onCurrentFloor =
                    u.building === "C" || ("floor" in u && u.floor === currentFloor);
                  const isSelected = u.id === selectedId;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(u.id)}
                        aria-pressed={isSelected}
                        className="min-h-11 w-full rounded border border-slate-200 px-2 py-2 text-sm font-medium text-slate-700 hover:bg-purple-50 aria-pressed:border-purple-600 aria-pressed:bg-purple-600 aria-pressed:text-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-purple-950"
                        style={{ opacity: onCurrentFloor ? 1 : 0.45 }}
                      >
                        {u.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
            Ingen treff
          </p>
        )}
      </div>
    </div>
  );
}
