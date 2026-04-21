import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Floor = 1 | 2 | 3;

const floors: Floor[] = [1, 2, 3];

export function FloorTabs({
  floor,
  onChange,
  className,
}: {
  floor: Floor;
  onChange: (f: Floor) => void;
  className?: string;
}) {
  return (
    <Tabs
      value={String(floor)}
      onValueChange={(value) => onChange(Number(value) as Floor)}
      aria-label="Velg etasje"
      className={className}
    >
      <TabsList className="w-full">
        {floors.map((f) => (
          <TabsTrigger key={f} value={String(f)}>
            {f}. etg
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
