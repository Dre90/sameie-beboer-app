import type { LucideIcon } from "lucide-react";
import { BellRingIcon, CircleQuestionMarkIcon, KeyRoundIcon, PackageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { responseLabels, type ResponseKind, type UnitStatus } from "@/lib/filter-types";

type Instruction = { action: string; detail?: string; icon: LucideIcon; tone: string };

export const responseInstructions: Record<ResponseKind, Instruction> = {
  home: {
    action: "Ring på",
    icon: BellRingIcon,
    tone: "border-l-map-home bg-map-home/15",
  },
  consent: {
    action: "Du kan låse deg inn",
    icon: KeyRoundIcon,
    tone: "border-l-map-consent bg-map-consent/15",
  },
  self_service: {
    action: "Sett filteret utenfor døra",
    icon: PackageIcon,
    tone: "border-l-map-self-service bg-map-self-service/20",
  },
  unanswered: {
    action: "Ring på. Ikke lås deg inn.",
    detail: "Skriv en beskjed til styret hvis ingen åpner.",
    icon: CircleQuestionMarkIcon,
    tone: "border-l-map-unanswered bg-map-unanswered/10",
  },
};

/** The saved resident response as a large instruction for the craftsman, colored like the map. */
export function ResponseInstruction({ unit }: { unit: UnitStatus }) {
  const { action, detail, icon: Icon, tone } = responseInstructions[unit.response];
  const labelId = `response-instruction-${unit.id}`;
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      data-testid={labelId}
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-l-8 border-control-border p-4 text-foreground",
        tone,
      )}
    >
      <Icon aria-hidden className="mt-1 size-7 shrink-0" />
      <div className="flex min-w-0 flex-col gap-1">
        <p id={labelId} className="text-sm font-medium">
          Beboersvar
        </p>
        <p className="font-heading text-2xl font-semibold">{responseLabels[unit.response]}</p>
        <p className="text-lg font-medium text-pretty">{action}</p>
        {detail && <p className="text-base text-pretty">{detail}</p>}
      </div>
    </div>
  );
}
