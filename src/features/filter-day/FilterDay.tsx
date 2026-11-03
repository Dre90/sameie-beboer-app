import { useState } from "react";
import {
  CheckIcon,
  DownloadIcon,
  LogOutIcon,
  PackageCheckIcon,
  RefreshCwIcon,
  SaveIcon,
  Undo2Icon,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/features/auth";
import { SiteMap, type UnitTone } from "@/features/map";
import { UnitInfo } from "@/features/map/components/UnitInfo";
import { UnitCommentEditor, UnitCommentNotice, ownCommentField } from "./components/UnitComments";
import { useFilterDay } from "./hooks/useFilterDay";
import { filterApi } from "@/lib/filter-api";
import { cn } from "@/lib/utils";
import {
  completionLabels,
  responseKinds,
  responseLabels,
  type ResponseKind,
  type UnitStatus,
} from "@/lib/filter-types";

export function FilterDay() {
  const { state, logout } = useAuth();
  const { overview, error, message, busy, stale, reload, save, setError, setMessage } =
    useFilterDay();
  const isBoard = state.status === "authenticated" && state.role === "board";

  const byId = new Map(overview?.units.map((unit) => [unit.id, unit]));
  const tones = new Map<string, UnitTone>(
    overview?.units.map((unit) => [
      unit.id,
      unit.completion !== "pending" ? "done" : unit.response,
    ]),
  );
  const completed = overview?.units.filter((unit) => unit.completion !== "pending").length ?? 0;
  const commentedUnitIds = new Set(
    overview?.units
      .filter((unit) => unit.board_comment || unit.craftsman_comment)
      .map((unit) => unit.id),
  );
  return (
    <main className="flex h-dvh min-h-0 flex-col bg-background text-foreground">
      <header className="flex shrink-0 flex-col gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="font-heading text-xl font-medium">Filterbytte</h1>
            <span className="text-sm text-muted-foreground">Saksvik Øvre</span>
            {overview?.eventDate && (
              <time className="text-sm" dateTime={overview.eventDate}>
                {overview.eventDate}
              </time>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{isBoard ? "Styret" : "Håndverker"}</Badge>
            <Button
              size="icon-lg"
              variant="outline"
              title="Hent ny status"
              aria-label="Hent ny status"
              disabled={busy}
              onClick={() => {
                setMessage("");
                void reload();
              }}
            >
              <RefreshCwIcon />
            </Button>
            {isBoard && (
              <a
                href="/api/export"
                aria-label="Last ned reserveoversikt"
                title="Last ned reserveoversikt"
                className={buttonVariants({ variant: "outline", size: "icon-lg" })}
              >
                <DownloadIcon />
              </a>
            )}
            <Button
              size="icon-lg"
              variant="ghost"
              aria-label="Logg ut"
              title="Logg ut"
              disabled={busy}
              onClick={() => {
                void logout().catch(() => setError("Utlogging feilet. Prøv igjen."));
              }}
            >
              <LogOutIcon />
            </Button>
          </div>
        </div>
        {overview && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              {completed} av {overview.units.length} leiligheter fullført
            </span>
            <span>Sist hentet: {new Date(overview.fetchedAt).toLocaleString("nb-NO")}</span>
          </div>
        )}
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs" aria-label="Tegnforklaring">
          {(["done", ...responseKinds] as const).map((tone) => (
            <li key={tone} className="flex items-center gap-1.5">
              <span
                aria-hidden
                data-tone={tone}
                className={cn(
                  "size-3 shrink-0 rounded-sm border border-border data-[tone=done]:bg-map-done data-[tone=home]:bg-map-home data-[tone=consent]:bg-map-consent data-[tone=unanswered]:bg-[repeating-linear-gradient(45deg,var(--color-secondary)_0_3px,var(--color-map-unanswered)_3px_6px)]",
                  tone === "self_service" && "bg-map-self-service",
                )}
              />
              {tone === "done" ? "Fullført / levert" : responseLabels[tone]}
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden
              data-testid="legend-comment-marker"
              className="size-2.5 shrink-0 rounded-full bg-foreground"
            />
            Har kommentar
          </li>
        </ul>
        <p role="status" className="min-h-4 text-xs text-muted-foreground">
          {busy ? "Laster ..." : message}
        </p>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </header>
      {overview && (
        <div className="relative min-h-0 flex-1">
          <SiteMap
            className="absolute inset-0 overflow-hidden"
            unitTone={tones}
            commentedUnitIds={commentedUnitIds}
            renderUnitInfo={(unit) => {
              const status = byId.get(unit.id);
              return (
                <div className="flex flex-col gap-5">
                  <UnitInfo unit={unit} />
                  <div className="flex flex-col gap-2 md:hidden">
                    {message && (
                      <p role="status" className="text-sm">
                        {message}
                      </p>
                    )}
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {stale && (
                      <Button variant="outline" disabled={busy} onClick={() => void reload()}>
                        <RefreshCwIcon data-icon="inline-start" />
                        Hent ny status
                      </Button>
                    )}
                  </div>
                  {status ? (
                    <>
                      <UnitCommentNotice
                        key={`notice:${status.id}`}
                        unit={status}
                        isBoard={isBoard}
                        disabled={busy || stale}
                        onSave={save}
                      />
                      {/* Keyed by saved values, so drafts survive saves of the other fields. */}
                      <UnitPanel
                        key={`panel:${status.id}:${status.response}`}
                        unit={status}
                        isBoard={isBoard}
                        disabled={busy || stale}
                        onSave={save}
                      />
                      <UnitCommentEditor
                        key={`editor:${status.id}:${status[ownCommentField(isBoard)]}`}
                        unit={status}
                        isBoard={isBoard}
                        disabled={busy || stale}
                        onSave={save}
                      />
                    </>
                  ) : (
                    <p>Status ikke tilgjengelig.</p>
                  )}
                </div>
              );
            }}
          />
        </div>
      )}
    </main>
  );
}

function UnitPanel({
  unit,
  isBoard,
  disabled,
  onSave,
}: {
  unit: UnitStatus;
  isBoard: boolean;
  disabled: boolean;
  onSave: (operation: () => Promise<{ unit: UnitStatus }>) => Promise<void>;
}) {
  const [response, setResponse] = useState<ResponseKind>(unit.response);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <div className="flex flex-col gap-5" data-testid={`unit-panel-${unit.id}`}>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{responseLabels[unit.response]}</Badge>
        <Badge variant={unit.completion === "pending" ? "secondary" : "default"}>
          {completionLabels[unit.completion]}
        </Badge>
      </div>
      {isBoard && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(() => filterApi.setResponse(unit, response));
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel id={`response-${unit.id}`}>Beboersvar</FieldLabel>
              <ToggleGroup
                size="lg"
                aria-labelledby={`response-${unit.id}`}
                variant="outline"
                spacing={2}
                className="flex-wrap"
                value={[response]}
                disabled={disabled}
                onValueChange={(values) => {
                  if (values.length) setResponse(values[0] as ResponseKind);
                }}
              >
                {responseKinds.map((kind) => (
                  <ToggleGroupItem key={kind} value={kind}>
                    {responseLabels[kind]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
            <Button type="submit" disabled={disabled || response === unit.response}>
              <SaveIcon data-icon="inline-start" />
              Lagre svar
            </Button>
          </FieldGroup>
        </form>
      )}
      {unit.completion === "pending" ? (
        <Button
          disabled={disabled || response !== unit.response}
          onClick={() =>
            void onSave(() =>
              filterApi.setCompletion(
                unit,
                unit.response === "self_service" ? "delivered" : "performed",
              ),
            )
          }
        >
          {unit.response === "self_service" ? (
            <PackageCheckIcon data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          {unit.response === "self_service" ? "Levert på døra" : "Marker utført"}
        </Button>
      ) : (
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogTrigger disabled={disabled} render={<Button variant="outline" />}>
            <Undo2Icon data-icon="inline-start" />
            Angre ferdigmarkering
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Angre for {unit.id}?</AlertDialogTitle>
              <AlertDialogDescription>
                Utførelsen settes til «Ikke utført». Beboersvaret beholdes.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction
                disabled={disabled}
                onClick={() => {
                  setConfirmOpen(false);
                  void onSave(() => filterApi.setCompletion(unit, "pending"));
                }}
              >
                Angre ferdigmarkering
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      <p className="text-xs text-muted-foreground">
        Sist endret: {new Date(unit.updated_at).toLocaleString("nb-NO")}
      </p>
    </div>
  );
}
