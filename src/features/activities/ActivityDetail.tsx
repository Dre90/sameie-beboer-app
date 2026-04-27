import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/features/auth";
import { SiteMap, type UnitTone } from "@/features/map";
import { UnitContactInfo } from "@/features/map/components/UnitContactInfo";
import { allUnits, type Unit } from "@/features/map/data/units";
import type {
  Activity,
  ActivityCompletion,
  ActivityResponse,
  ActivityResponseKind,
  CompletionType,
} from "@/lib/api-types";

const buildingLabels = {
  A: "Bygg A",
  B: "Bygg B",
  C: "Rekkehus C (alle etasjer)",
} as const;

/**
 * Activity overview centred around the site map. Clicking a unit opens an
 * info panel reused from the map feature, where the per-unit response and
 * completion can be edited. The map is color-coded by status.
 */
export function ActivityDetail() {
  const params = useParams<{ id: string }>();
  const idNum = Number(params.id);
  const user = useCurrentUser();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [responses, setResponses] = useState<ActivityResponse[]>([]);
  const [completions, setCompletions] = useState<ActivityCompletion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [{ activities }, status] = await Promise.all([
        api.activities.list(),
        api.activities.status(idNum),
      ]);
      setActivity(activities.find((a) => a.id === idNum) ?? null);
      setResponses(status.responses);
      setCompletions(status.completions);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kunne ikke laste aktivitet");
    } finally {
      setLoaded(true);
    }
  }, [idNum]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const responseByUnit = useMemo(() => {
    const m = new Map<string, ActivityResponse>();
    for (const r of responses) m.set(r.unit_id, r);
    return m;
  }, [responses]);

  const completionByUnit = useMemo(() => {
    const m = new Map<string, ActivityCompletion>();
    for (const c of completions) m.set(c.unit_id, c);
    return m;
  }, [completions]);

  const unitTone = useMemo(() => {
    const m = new Map<string, UnitTone>();
    for (const u of allUnits) {
      const completion = completionByUnit.get(u.id);
      if (completion) {
        m.set(u.id, "done");
        continue;
      }
      const response = responseByUnit.get(u.id)?.response;
      if (response === "home") m.set(u.id, "home");
      else if (response === "consent") m.set(u.id, "consent");
      else if (response === "self_service") m.set(u.id, "self_service");
      else m.set(u.id, "unanswered");
    }
    return m;
  }, [responseByUnit, completionByUnit]);

  const setResponseFor = useCallback(
    async (unitId: string, response: ActivityResponseKind) => {
      try {
        await api.activities.setResponse(idNum, unitId, { response });
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke lagre svar");
      }
    },
    [idNum, reload],
  );

  const completeFor = useCallback(
    async (unitId: string, type: CompletionType) => {
      try {
        await api.activities.complete(idNum, unitId, { completion_type: type });
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke markere utført");
      }
    },
    [idNum, reload],
  );

  const undoFor = useCallback(
    async (unitId: string) => {
      try {
        await api.activities.undoComplete(idNum, unitId);
        await reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Kunne ikke angre");
      }
    },
    [idNum, reload],
  );

  const isBoard = user.role === "board";

  const renderUnitInfo = useCallback(
    (unit: Unit) => (
      <ActivityUnitPanel
        unit={unit}
        response={responseByUnit.get(unit.id)}
        completion={completionByUnit.get(unit.id)}
        isBoard={isBoard}
        currentEmail={user.email}
        onSetResponse={(r) => setResponseFor(unit.id, r)}
        onComplete={(t) => completeFor(unit.id, t)}
        onUndo={() => undoFor(unit.id)}
      />
    ),
    [responseByUnit, completionByUnit, isBoard, user.email, setResponseFor, completeFor, undoFor],
  );

  if (!loaded) return <div className="px-4 py-8 text-muted-foreground">Laster …</div>;
  if (!activity)
    return (
      <div className="px-4 py-8">
        <p>Aktivitet ikke funnet.</p>
        <Link to="/" className="text-sm underline">
          Tilbake
        </Link>
      </div>
    );

  const totalUnits = allUnits.length;
  const donePct = Math.round((completions.length / totalUnits) * 100);

  return (
    <div className="flex h-[calc(100dvh-4rem)] w-full flex-col">
      <header className="space-y-1 border-b border-border px-4 py-3">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Tilbake
        </Link>
        <h1 className="font-heading text-xl font-medium">{activity.title}</h1>
        {activity.description && (
          <p className="text-sm text-muted-foreground">{activity.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span>
            {completions.length} av {totalUnits} leiligheter fullført ({donePct} %)
          </span>
          <Legend />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="border-b border-destructive bg-destructive/10 px-4 py-2 text-sm"
        >
          {error}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <SiteMap
          unitTone={unitTone}
          renderUnitInfo={renderUnitInfo}
          className="absolute inset-0 overflow-hidden"
        />
      </div>
    </div>
  );
}

function Legend() {
  const items: Array<{ tone: UnitTone; label: string }> = [
    { tone: "done", label: "Utført" },
    { tone: "home", label: "Hjemme" },
    { tone: "consent", label: "Samtykke" },
    { tone: "self_service", label: "Gjør selv" },
    { tone: "unanswered", label: "Mangler svar" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Tegnforklaring">
      {items.map((it) => (
        <li key={it.tone} className="flex items-center gap-1.5">
          <span
            data-tone={it.tone}
            aria-hidden
            className="inline-block size-3 rounded-sm border border-border data-[tone=done]:bg-map-done data-[tone=home]:bg-map-home data-[tone=consent]:bg-map-consent data-[tone=self_service]:bg-map-self-service data-[tone=unanswered]:border-map-unanswered data-[tone=unanswered]:bg-[repeating-linear-gradient(45deg,var(--color-secondary)_0_3px,color-mix(in_oklch,var(--map-unanswered)_55%,transparent)_3px_6px)]"
          />
          <span>{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

function ActivityUnitPanel({
  unit,
  response,
  completion,
  isBoard,
  currentEmail,
  onSetResponse,
  onComplete,
  onUndo,
}: {
  unit: Unit;
  response: ActivityResponse | undefined;
  completion: ActivityCompletion | undefined;
  isBoard: boolean;
  currentEmail: string;
  onSetResponse: (r: ActivityResponseKind) => void;
  onComplete: (t: CompletionType) => void;
  onUndo: () => void;
}) {
  const location =
    unit.building === "C"
      ? buildingLabels.C
      : `${buildingLabels[unit.building]} — ${unit.floor}. etg`;

  const canUndo =
    completion !== undefined && (isBoard || completion.completed_by_email === currentEmail);

  const responseKind: ActivityResponseKind = response?.response ?? "unanswered";

  return (
    <div className="flex flex-col gap-4" data-testid={`unit-panel-${unit.id}`}>
      <div>
        <h2 className="font-heading text-2xl font-medium text-foreground">{unit.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{location}</p>
      </div>

      <UnitContactInfo unitId={unit.id} />

      <div className="flex flex-wrap items-center gap-2">
        <ResponseBadge response={responseKind} />
        {completion && (
          <Badge variant="default">{completionLabel(completion.completion_type)}</Badge>
        )}
      </div>

      {isBoard && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Svar fra beboer</p>
          <div className="flex flex-wrap gap-1">
            <ResponseButton active={responseKind === "home"} onClick={() => onSetResponse("home")}>
              Hjemme
            </ResponseButton>
            <ResponseButton
              active={responseKind === "consent"}
              onClick={() => onSetResponse("consent")}
            >
              Samtykke
            </ResponseButton>
            <ResponseButton
              active={responseKind === "self_service"}
              onClick={() => onSetResponse("self_service")}
            >
              Gjør selv
            </ResponseButton>
            <ResponseButton
              active={responseKind === "unanswered"}
              onClick={() => onSetResponse("unanswered")}
            >
              Mangler svar
            </ResponseButton>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {completion ? (
          canUndo && (
            <Button type="button" size="sm" variant="ghost" onClick={onUndo}>
              Angre
            </Button>
          )
        ) : responseKind === "self_service" ? (
          <Button type="button" size="sm" onClick={() => onComplete("delivered")}>
            Levert på døra
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => onComplete("performed")}>
            Marker utført
          </Button>
        )}
      </div>
    </div>
  );
}

function ResponseBadge({ response }: { response: ActivityResponseKind }) {
  const label =
    response === "home"
      ? "Hjemme"
      : response === "consent"
        ? "Samtykke"
        : response === "self_service"
          ? "Gjør selv"
          : "Mangler svar";
  return <Badge variant={response === "unanswered" ? "destructive" : "outline"}>{label}</Badge>;
}

function ResponseButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-2 py-0.5 text-xs " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

function completionLabel(t: CompletionType) {
  return t === "performed" ? "Utført" : "Levert";
}
