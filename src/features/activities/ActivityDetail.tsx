import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/features/auth";
import { allUnits } from "@/features/map/data/units";
import type {
  Activity,
  ActivityCompletion,
  ActivityResponse,
  ActivityResponseKind,
  CompletionType,
} from "@/lib/api-types";

/**
 * Per-unit activity status shown as a grid. Board can set responses.
 * Craftsmen and board can mark completions.
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

  async function setResponse(unitId: string, response: ActivityResponseKind) {
    try {
      await api.activities.setResponse(idNum, unitId, { response });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke lagre svar");
    }
  }

  async function complete(unitId: string, type: CompletionType) {
    try {
      await api.activities.complete(idNum, unitId, { completion_type: type });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke markere utført");
    }
  }

  async function undo(unitId: string) {
    try {
      await api.activities.undoComplete(idNum, unitId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke angre");
    }
  }

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

  const isBoard = user.role === "board";
  const totalUnits = allUnits.length;
  const donePct = Math.round((completions.length / totalUnits) * 100);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link to="/" className="text-sm text-muted-foreground hover:underline">
          ← Tilbake
        </Link>
        <h1 className="font-heading text-2xl font-medium">{activity.title}</h1>
        {activity.description && <p className="text-muted-foreground">{activity.description}</p>}
        <p className="text-sm text-muted-foreground">
          {completions.length} av {totalUnits} leiligheter fullført ({donePct} %)
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Leiligheter</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allUnits.map((u) => {
              const response = responseByUnit.get(u.id);
              const completion = completionByUnit.get(u.id);
              const canUndo =
                completion && (isBoard || completion.completed_by_email === user.email);
              return (
                <li
                  key={u.id}
                  className="rounded-md border border-border p-3 text-sm"
                  data-testid={`unit-card-${u.id}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{u.label}</span>
                    <ResponseBadge response={response?.response} />
                    {completion && (
                      <Badge variant="default">{completionLabel(completion.completion_type)}</Badge>
                    )}
                  </div>
                  {isBoard && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      <ResponseButton
                        active={response?.response === "home"}
                        onClick={() => setResponse(u.id, "home")}
                      >
                        Hjemme
                      </ResponseButton>
                      <ResponseButton
                        active={response?.response === "consent"}
                        onClick={() => setResponse(u.id, "consent")}
                      >
                        Samtykke
                      </ResponseButton>
                      <ResponseButton
                        active={response?.response === "self_service"}
                        onClick={() => setResponse(u.id, "self_service")}
                      >
                        Gjør selv
                      </ResponseButton>
                      <ResponseButton
                        active={!response?.response || response.response === "unanswered"}
                        onClick={() => setResponse(u.id, "unanswered")}
                      >
                        Ubesvart
                      </ResponseButton>
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    {completion ? (
                      canUndo && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => undo(u.id)}>
                          Angre
                        </Button>
                      )
                    ) : response?.response === "self_service" ? (
                      <Button type="button" size="sm" onClick={() => complete(u.id, "delivered")}>
                        Levert på døra
                      </Button>
                    ) : (
                      <Button type="button" size="sm" onClick={() => complete(u.id, "performed")}>
                        Marker utført
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ResponseBadge({ response }: { response?: ActivityResponseKind }) {
  const kind = response ?? "unanswered";
  const label =
    kind === "home"
      ? "Hjemme"
      : kind === "consent"
        ? "Samtykke"
        : kind === "self_service"
          ? "Gjør selv"
          : "Ubesvart";
  return <Badge variant={kind === "unanswered" ? "secondary" : "outline"}>{label}</Badge>;
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
