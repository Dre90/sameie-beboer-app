import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import type { Activity, ActivityStatus } from "@/lib/api-types";

export function ActivitiesAdmin() {
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { activities } = await api.activities.list();
      setActivities(activities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await api.activities.create({
        title: title.trim(),
        description: description.trim() || null,
        status: "active",
      });
      setTitle("");
      setDescription("");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke opprette");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatus(id: number, status: ActivityStatus) {
    try {
      await api.activities.update(id, { status });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oppdatere");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Opprett aktivitet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              placeholder="Tittel (f.eks. 'Bytte luftfilter høst 2026')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <textarea
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              placeholder="Beskrivelse (valgfritt)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Button type="submit" disabled={saving}>
              {saving ? "Lagrer …" : "Opprett"}
            </Button>
          </form>
        </CardContent>
      </Card>

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
          <CardTitle>Aktiviteter</CardTitle>
        </CardHeader>
        <CardContent>
          {activities === null ? (
            <p className="text-muted-foreground">Laster …</p>
          ) : activities.length === 0 ? (
            <p className="text-muted-foreground">Ingen aktiviteter ennå.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex-1">
                    <Link to={`/aktivitet/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    {a.description && (
                      <p className="text-xs text-muted-foreground">{a.description}</p>
                    )}
                  </div>
                  <Badge variant={a.status === "active" ? "default" : "secondary"}>
                    {statusLabel(a.status)}
                  </Badge>
                  <select
                    aria-label={`Status for ${a.title}`}
                    className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                    value={a.status}
                    onChange={(e) => handleStatus(a.id, e.target.value as ActivityStatus)}
                  >
                    <option value="draft">Utkast</option>
                    <option value="active">Aktiv</option>
                    <option value="done">Fullført</option>
                  </select>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function statusLabel(s: ActivityStatus) {
  return s === "draft" ? "Utkast" : s === "active" ? "Aktiv" : "Fullført";
}
