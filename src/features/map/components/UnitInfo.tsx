import { type Unit } from "../data/units";
import { UnitContactInfo } from "./UnitContactInfo";

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
      <UnitContactInfo unitId={unit.id} />
    </div>
  );
}
