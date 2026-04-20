import { type Unit } from "./data/units";

export function UnitInfo({ unit }: { unit: Unit }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{unit.label}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        {unit.building === "A"
          ? "Bygg A"
          : unit.building === "B"
            ? "Bygg B"
            : "Rekkehus C (alle etasjer)"}
        {unit.building !== "C" && "floor" in unit && ` — ${unit.floor}. etg`}
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-500 dark:text-slate-400">Beboer</dt>
        <dd className="text-slate-700 dark:text-slate-300">—</dd>
        <dt className="text-slate-500 dark:text-slate-400">Sist filterbytte</dt>
        <dd className="text-slate-700 dark:text-slate-300">—</dd>
        <dt className="text-slate-500 dark:text-slate-400">Notater</dt>
        <dd className="text-slate-700 dark:text-slate-300">—</dd>
      </dl>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        Beboerinfo kobles på senere.
      </p>
    </div>
  );
}
