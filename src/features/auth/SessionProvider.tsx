import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LogInIcon, RefreshCwIcon } from "lucide-react";
import { ApiError, apiRequest } from "@/lib/api";
import type { Role } from "@/lib/filter-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SessionState =
  | { status: "loading" | "anonymous" }
  | { status: "error"; message: string }
  | { status: "authenticated"; role: Role };
type AuthValue = {
  state: SessionState;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ status: "loading" });
  async function refresh() {
    setState({ status: "loading" });
    try {
      const { role } = await apiRequest<{ role: Role }>("/api/session");
      setState({ status: "authenticated", role });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setState({ status: "anonymous" });
      else setState({ status: "error", message: "Kunne ikke kontakte serveren." });
    }
  }
  useEffect(() => {
    void refresh();
    const expire = () => setState({ status: "anonymous" });
    window.addEventListener("session-expired", expire);
    return () => window.removeEventListener("session-expired", expire);
  }, []);
  async function login(password: string) {
    const { role } = await apiRequest<{ role: Role }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setState({ status: "authenticated", role });
  }
  async function logout() {
    await apiRequest("/api/logout", { method: "POST", body: "{}" });
    setState({ status: "anonymous" });
  }
  return <AuthContext value={{ state, login, logout, refresh }}>{children}</AuthContext>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { state, login, refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (state.status === "authenticated") return children;
  if (state.status === "loading")
    return (
      <main className="p-8">
        <h1 className="sr-only">Filterbytte</h1>
        <p role="status">Laster ...</p>
      </main>
    );
  if (state.status === "error")
    return (
      <main className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
        <h1 className="font-heading text-2xl font-medium">Filterbytte</h1>
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button onClick={() => void refresh()}>
          <RefreshCwIcon data-icon="inline-start" />
          Prøv igjen
        </Button>
      </main>
    );
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Saksvik Øvre</p>
        <h1 className="font-heading text-2xl font-medium">Filterbytte</h1>
      </header>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            await login(password);
          } catch (failure) {
            setError(failure instanceof Error ? failure.message : "Innlogging feilet");
          } finally {
            setPassword("");
            setBusy(false);
          }
        }}
      >
        <FieldGroup>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="password">Passord</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
            {error && <FieldError id="login-error">{error}</FieldError>}
          </Field>
          <Button type="submit" disabled={busy || !password}>
            <LogInIcon data-icon="inline-start" />
            {busy ? "Logger inn ..." : "Logg inn"}
          </Button>
        </FieldGroup>
      </form>
    </main>
  );
}
