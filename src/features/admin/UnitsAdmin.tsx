import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import type { Resident, Unit } from "@/lib/api-types";

/**
 * Minimal leiligheter-admin: list units discovered via API + allow adding residents
 * and toggling rental info.
 * Units are stored lazily — the `units` table starts empty; it auto-gets a row when
 * residents/responses are added. For an initial population, use the "opprett"-knappen.
 */
export function UnitsAdmin({ unitIds }: { unitIds: string[] }) {
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { units } = await api.units.list();
      setUnits(units);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const byId = useMemo(() => {
    const map = new Map<string, Unit>();
    for (const u of units ?? []) map.set(u.id, u);
    return map;
  }, [units]);

  return (
    <div className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm"
        >
          {error}
        </div>
      )}
      {units === null ? (
        <p className="text-muted-foreground">Laster …</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {unitIds.map((id) => {
            const u = byId.get(id);
            const residents = u?.residents ?? [];
            return (
              <li key={id}>
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>{id}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(expanded === id ? null : id)}
                      >
                        {expanded === id ? "Lukk" : "Rediger"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {residents.length === 0 ? (
                      <p className="text-muted-foreground">Ingen beboere registrert.</p>
                    ) : (
                      <ul className="space-y-1">
                        {residents.map((r) => (
                          <li key={r.id} className="flex items-baseline gap-2">
                            <span>{r.name}</span>
                            {r.phone && (
                              <span className="text-xs text-muted-foreground">{r.phone}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {u?.is_rented && (
                      <p className="text-xs text-muted-foreground">
                        Utleid · eier: {u.owner_name ?? "ukjent"}
                      </p>
                    )}
                    {expanded === id && (
                      <UnitEditor unit={u} unitId={id} residents={residents} onChange={reload} />
                    )}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UnitEditor({
  unit,
  unitId,
  residents,
  onChange,
}: {
  unit: Unit | undefined;
  unitId: string;
  residents: Resident[];
  onChange: () => Promise<void>;
}) {
  const [isRented, setIsRented] = useState(unit?.is_rented ?? false);
  const [ownerName, setOwnerName] = useState(unit?.owner_name ?? "");
  const [ownerEmail, setOwnerEmail] = useState(unit?.owner_email ?? "");
  const [ownerPhone, setOwnerPhone] = useState(unit?.owner_phone ?? "");
  const [newResident, setNewResident] = useState({ name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  async function saveUnit() {
    setSaving(true);
    try {
      await api.units.upsert(unitId, {
        is_rented: isRented,
        owner_name: ownerName || null,
        owner_email: ownerEmail || null,
        owner_phone: ownerPhone || null,
      });
      await onChange();
    } finally {
      setSaving(false);
    }
  }

  async function addResident(e: React.FormEvent) {
    e.preventDefault();
    if (!newResident.name.trim()) return;
    await api.units.addResident(unitId, {
      name: newResident.name.trim(),
      email: newResident.email.trim() || null,
      phone: newResident.phone.trim() || null,
    });
    setNewResident({ name: "", email: "", phone: "" });
    await onChange();
  }

  async function removeResident(id: number) {
    if (!confirm("Fjerne beboer?")) return;
    await api.units.removeResident(unitId, id);
    await onChange();
  }

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isRented} onChange={(e) => setIsRented(e.target.checked)} />
        Utleid
      </label>
      {isRented && (
        <div className="grid gap-2">
          <Input
            placeholder="Eier navn"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
          />
          <Input
            placeholder="Eier e-post"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
          />
          <Input
            placeholder="Eier telefon"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
          />
        </div>
      )}
      <Button type="button" size="sm" onClick={saveUnit} disabled={saving}>
        Lagre leilighet
      </Button>

      <div>
        <h4 className="font-medium">Beboere</h4>
        <ul className="space-y-1 text-sm">
          {residents.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <span className="flex-1">
                {r.name}
                {r.email && <span className="ml-2 text-xs text-muted-foreground">{r.email}</span>}
                {r.phone && <span className="ml-2 text-xs text-muted-foreground">{r.phone}</span>}
              </span>
              <Button type="button" size="sm" variant="ghost" onClick={() => removeResident(r.id)}>
                Fjern
              </Button>
            </li>
          ))}
        </ul>
        <form onSubmit={addResident} className="mt-2 grid gap-2">
          <Input
            placeholder="Navn"
            value={newResident.name}
            onChange={(e) => setNewResident((r) => ({ ...r, name: e.target.value }))}
            required
          />
          <Input
            placeholder="E-post (valgfritt)"
            value={newResident.email}
            onChange={(e) => setNewResident((r) => ({ ...r, email: e.target.value }))}
          />
          <Input
            placeholder="Telefon (valgfritt)"
            value={newResident.phone}
            onChange={(e) => setNewResident((r) => ({ ...r, phone: e.target.value }))}
          />
          <Button type="submit" size="sm">
            Legg til beboer
          </Button>
        </form>
      </div>
    </div>
  );
}
