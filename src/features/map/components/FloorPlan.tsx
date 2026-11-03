import { type UnitGeometry, VIEW_BOX } from "../data/geometry";
import { isLargeUnit } from "../data/units";
import { getTone, type UnitTone, type UnitToneMap } from "../lib/tone";
import { cn } from "@/lib/utils";

type Props = {
  geometry: UnitGeometry;
  selectedId: string | null;
  onSelect: (id: string) => void;
  floor: 1 | 2 | 3;
  unitTone?: UnitToneMap;
  commentedUnitIds?: ReadonlySet<string>;
};

const toneLabels: Record<UnitTone, string> = {
  neutral: "Status ikke tilgjengelig",
  unanswered: "Mangler svar",
  home: "Hjemme",
  consent: "Samtykke",
  self_service: "Gjør selv",
  done: "Fullført eller levert",
};

export function FloorPlan({
  geometry,
  selectedId,
  onSelect,
  floor,
  unitTone,
  commentedUnitIds,
}: Props) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      className="h-full w-full"
      role="group"
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
        const hasComment = commentedUnitIds?.has(id) ?? false;
        const commentNote = hasComment ? ", har kommentar" : "";
        return (
          <g key={id}>
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.w}
              height={rect.h}
              rx={4}
              onClick={() => onSelect(id)}
              role="button"
              tabIndex={0}
              aria-label={`Leilighet ${id}${isLargeUnit(id) ? ", stor leilighet" : ""}, ${toneLabels[tone]}${commentNote}`}
              aria-pressed={isSelected}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  if (!event.repeat) onSelect(id);
                }
              }}
              data-selected={isSelected}
              data-townhouse={isTownhouse}
              data-tone={tone}
              className={cn(
                "cursor-pointer fill-secondary transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[tone=done]:fill-map-done data-[tone=home]:fill-map-home data-[tone=consent]:fill-map-consent data-[tone=unanswered]:fill-[url(#map-unanswered-stripes)]",
                tone === "self_service" && "fill-map-self-service",
                isSelected
                  ? "stroke-foreground"
                  : "stroke-border hover:stroke-primary data-[tone=unanswered]:stroke-map-unanswered",
              )}
              strokeWidth={isSelected ? 4 : 1.5}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${id}: ${toneLabels[tone]}${commentNote}`}</title>
            </rect>
            {hasComment && (
              <circle
                cx={rect.x + rect.w - 10}
                cy={rect.y + 10}
                r={6}
                aria-hidden="true"
                data-comment-marker={id}
                className="pointer-events-none fill-foreground stroke-background"
                strokeWidth={2}
              />
            )}
            <text
              x={rect.x + rect.w / 2}
              y={rect.y + rect.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              aria-hidden="true"
              className="pointer-events-none select-none fill-foreground stroke-background text-[18px] font-semibold"
              strokeWidth={5}
              strokeLinejoin="round"
              paintOrder="stroke"
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
