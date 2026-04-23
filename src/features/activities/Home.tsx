import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useCurrentUser } from "@/features/auth";
import type { Activity } from "@/lib/api-types";

export function Home() {
  const user = useCurrentUser();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.activities
      .list()
      .then((r) => {
        if (!cancelled) setActivities(r.activities);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Kunne ikke laste");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = (activities ?? []).filter((a) => a.status === "active");

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl font-medium">Hei, {user.name.split(" ")[0]}</h1>
        <p className="text-muted-foreground">
          {user.role === "board"
            ? "Her ser du aktive aktiviteter. Gå til Admin for å administrere."
            : "Her er aktive oppdrag."}
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
          <CardTitle>Aktive aktiviteter</CardTitle>
        </CardHeader>
        <CardContent>
          {activities === null ? (
            <p className="text-muted-foreground">Laster …</p>
          ) : active.length === 0 ? (
            <p className="text-muted-foreground">Ingen aktive aktiviteter.</p>
          ) : (
            <ul className="space-y-2">
              {active.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/aktivitet/${a.id}`}
                    className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-muted"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-muted-foreground">{a.description}</p>
                      )}
                    </div>
                    <Badge>Aktiv</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <nav className="flex gap-3 text-sm">
        <Link to="/kart" className="text-primary underline">
          Se kart
        </Link>
        {user.role === "board" && (
          <Link to="/admin" className="text-primary underline">
            Admin
          </Link>
        )}
      </nav>
    </div>
  );
}
