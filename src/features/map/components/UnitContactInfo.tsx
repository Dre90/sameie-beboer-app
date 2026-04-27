import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api";
import type { Resident, Unit as ApiUnit } from "@/lib/api-types";

/**
 * Shows beboer + utleie-info for a given unit, sourced from `/admin/leiligheter`
 * (the `/api/units` endpoint). Used inside the map's info panel and the
 * activity unit panel so all viewers see the same registered details.
 */
export function UnitContactInfo({ unitId }: { unitId: string }) {
  const [unit, setUnit] = useState<ApiUnit | null>(null);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    api.units
      .get(unitId)
      .then((res) => {
        if (cancelled) return;
        setUnit(res.unit);
        // The worker returns residents as a top-level field on GET-by-id, but
        // older shapes nested them inside `unit`. Accept either.
        setResidents(res.residents ?? res.unit?.residents ?? []);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 404 just means the unit hasn't been registered yet — treat as empty.
        if (err instanceof ApiError && err.status === 404) {
          setUnit(null);
          setResidents([]);
          setError(null);
          return;
        }
        setError(err instanceof Error ? err.message : "Kunne ikke laste leilighet");
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [unitId]);

  if (!loaded) {
    return <p className="text-xs text-muted-foreground">Laster beboerinfo …</p>;
  }
  if (error) {
    return (
      <p role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  }

  const isRented = unit?.is_rented ?? false;

  return (
    <div className="space-y-3 text-sm" data-testid="unit-contact-info">
      <section>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Beboere
        </h3>
        {residents.length === 0 ? (
          <p className="text-muted-foreground">Ingen beboere registrert.</p>
        ) : (
          <ul className="mt-1 space-y-1">
            {residents.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-foreground">{r.name}</span>
                {r.phone && (
                  <a
                    href={`tel:${r.phone}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {r.phone}
                  </a>
                )}
                {r.email && (
                  <a
                    href={`mailto:${r.email}`}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    {r.email}
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {isRented && (
        <section>
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Utleid — eier
          </h3>
          <ul className="mt-1 space-y-0.5">
            <li className="text-foreground">{unit?.owner_name ?? "Ukjent"}</li>
            {unit?.owner_phone && (
              <li>
                <a
                  href={`tel:${unit.owner_phone}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {unit.owner_phone}
                </a>
              </li>
            )}
            {unit?.owner_email && (
              <li>
                <a
                  href={`mailto:${unit.owner_email}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {unit.owner_email}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}
    </div>
  );
}
