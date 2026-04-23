import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { ApiError } from "@/lib/api";
import { useCurrentUser } from "@/features/auth";
import type { AuthUser, UserRole } from "@/lib/api-types";

type FormState = {
  email: string;
  name: string;
  role: UserRole;
};

const emptyForm: FormState = { email: "", name: "", role: "craftsman" };

export function UsersAdmin() {
  const current = useCurrentUser();
  const [users, setUsers] = useState<AuthUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    try {
      const { users } = await api.users.list();
      setUsers(users);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke laste brukere");
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.name) return;
    setSaving(true);
    try {
      await api.users.create({
        email: form.email.trim().toLowerCase(),
        name: form.name.trim(),
        role: form.role,
      });
      setForm(emptyForm);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kunne ikke legge til bruker");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(email: string) {
    if (email === current.email) return;
    if (!confirm(`Fjerne ${email} fra tilgangslisten?`)) return;
    try {
      await api.users.remove(email);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke slette");
    }
  }

  async function handleRoleChange(email: string, role: UserRole) {
    try {
      await api.users.update(email, { role });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunne ikke oppdatere rolle");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Legg til bruker</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <Input
              type="email"
              placeholder="E-post"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
            <Input
              placeholder="Navn"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
            <select
              aria-label="Rolle"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
            >
              <option value="craftsman">Håndverker</option>
              <option value="board">Styret</option>
            </select>
            <Button type="submit" disabled={saving}>
              {saving ? "Lagrer …" : "Legg til"}
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
          <CardTitle>Brukere</CardTitle>
        </CardHeader>
        <CardContent>
          {users === null ? (
            <p className="text-muted-foreground">Laster …</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">Ingen brukere ennå.</p>
          ) : (
            <table className="w-full border-separate border-spacing-y-2 text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th className="font-medium">Navn</th>
                  <th className="font-medium">E-post</th>
                  <th className="font-medium">Rolle</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.email}>
                    <td>{u.name}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td>
                      <select
                        aria-label={`Rolle for ${u.email}`}
                        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.email, e.target.value as UserRole)}
                        disabled={u.email === current.email}
                      >
                        <option value="craftsman">Håndverker</option>
                        <option value="board">Styret</option>
                      </select>
                      {u.email === current.email && (
                        <Badge variant="secondary" className="ml-2">
                          Du
                        </Badge>
                      )}
                    </td>
                    <td className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(u.email)}
                        disabled={u.email === current.email}
                      >
                        Slett
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
