import { type UnitGeometry, VIEW_BOX } from "./data/geometry";

type Props = {
  geometry: UnitGeometry;
  selectedId: string | null;
  onSelect: (id: string) => void;
  floor: 1 | 2 | 3;
};

export function FloorPlan({ geometry, selectedId, onSelect, floor }: Props) {
  return (
    <svg
      viewBox={`0 0 ${VIEW_BOX.width} ${VIEW_BOX.height}`}
      className="h-full w-full"
      role="img"
      aria-label={`Etasjeplan ${floor}. etasje`}
    >
      <rect
        x={0}
        y={0}
        width={VIEW_BOX.width}
        height={VIEW_BOX.height}
        className="fill-slate-50 dark:fill-slate-900"
      />
      {Object.entries(geometry).map(([id, rect]) => {
        const isSelected = id === selectedId;
        const isTownhouse = id.startsWith("C");
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
              className="cursor-pointer stroke-slate-400 transition-colors fill-slate-200 hover:fill-purple-200 data-[selected=true]:fill-purple-500 data-[selected=true]:stroke-purple-700 dark:fill-slate-700 dark:hover:fill-purple-800 dark:data-[selected=true]:fill-purple-500"
              strokeWidth={1.5}
            />
            <text
              x={rect.x + rect.w / 2}
              y={rect.y + rect.h / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="pointer-events-none select-none fill-slate-700 text-[18px] font-semibold dark:fill-slate-200"
            >
              {id}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
