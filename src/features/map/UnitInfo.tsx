import { type Unit } from "./data/units";

const buildingLabels = {
  A: "Bygg A",
  B: "Bygg B",
  C: "Rekkehus C (alle etasjer)",
} as const;

export function UnitInfo({ unit }: { unit: Unit }) {
  const location =
    unit.building === "C"
      ? buildingLabels.C
      : `${buildingLabels[unit.building]} — ${unit.floor}. etg`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-heading text-2xl font-medium text-foreground">{unit.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{location}</p>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Beboer</dt>
        <dd className="text-foreground">—</dd>
        <dt className="text-muted-foreground">Sist filterbytte</dt>
        <dd className="text-foreground">—</dd>
        <dt className="text-muted-foreground">Notater</dt>
        <dd className="text-foreground">—</dd>
      </dl>
      <p className="text-xs text-muted-foreground">Beboerinfo kobles på senere.</p>
    </div>
  );
}
