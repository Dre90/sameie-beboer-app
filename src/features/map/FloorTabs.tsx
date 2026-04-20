type Floor = 1 | 2 | 3;

const floors: Floor[] = [1, 2, 3];

export function FloorTabs({
  floor,
  onChange,
  className = "",
}: {
  floor: Floor;
  onChange: (f: Floor) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label="Velg etasje"
      className={`flex rounded-lg border border-slate-200 bg-white/90 p-1 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 ${className}`}
    >
      {floors.map((f) => (
        <button
          key={f}
          type="button"
          role="tab"
          aria-selected={f === floor}
          onClick={() => onChange(f)}
          className="flex-1 rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors aria-selected:bg-purple-600 aria-selected:text-white dark:text-slate-300"
        >
          {f}. etg
        </button>
      ))}
    </div>
  );
}
