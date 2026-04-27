import { type UnitGeometry, VIEW_BOX } from "../data/geometry";
import { getTone, type UnitToneMap } from "../lib/tone";

type Props = {
  geometry: UnitGeometry;
  selectedId: string | null;
  onSelect: (id: string) => void;
  floor: 1 | 2 | 3;
  unitTone?: UnitToneMap;
};

export function FloorPlan({ geometry, selectedId, onSelect, floor, unitTone }: Props) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      className="h-full w-full"
      role="img"
      aria-label={`Etasjeplan ${floor}. etasje`}
    >
      <defs>
        {/* Diagonal stripes used to flag units that haven't responded yet. */}
        <pattern
          id="map-unanswered-stripes"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" className="fill-secondary" />
          <rect width="3" height="8" className="fill-map-unanswered" opacity={0.55} />
        </pattern>
      </defs>
      <rect
        x={0}
        y={0}
        width={VIEW_BOX.width}
        height={VIEW_BOX.height}
        className="fill-background"
      />
      {Object.entries(geometry).map(([id, rect]) => {
        const isSelected = id === selectedId;
        const isTownhouse = id.startsWith("C");
        const tone = getTone(unitTone, id);
        return (
          <g key={id}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              rx={4}
              onClick={() => onSelect(id)}
              data-selected={isSelected}
              data-townhouse={isTownhouse}
              data-tone={tone}
              className="cursor-pointer stroke-border transition-colors fill-secondary hover:fill-primary/25 hover:stroke-primary data-[tone=done]:fill-map-done data-[tone=home]:fill-map-home data-[tone=consent]:fill-map-consent data-[tone=self_service]:fill-map-self-service data-[tone=unanswered]:fill-[url(#map-unanswered-stripes)] data-[tone=unanswered]:stroke-map-unanswered data-[selected=true]:fill-primary data-[selected=true]:stroke-primary"
              strokeWidth={1.5}
            />
            <text
              x={rect.x + rect.w / 2}
              y={rect.y + rect.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none fill-foreground text-[18px] font-semibold data-[selected=true]:fill-primary-foreground"
              data-selected={isSelected}
            >
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
