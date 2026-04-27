import { useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { ApiError, apiRequest } from "@/lib/api";
import type { UserRole } from "@/lib/api-types";

type AuthState = ReturnType<typeof useAuth>["state"];

function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Laster"
      className="flex min-h-[60vh] items-center justify-center text-muted-foreground"
    >
      Laster …
    </div>
  );
}

function UnauthenticatedScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ registered: boolean }>("/api/auth/check", {
        method: "POST",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.registered) {
        onLogin();
      } else {
        setError("Denne e-posten er ikke registrert. Kontakt styret for å få tilgang.");
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Kunne ikke kontakte serveren";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center font-heading text-2xl font-medium">Logg inn</h1>
      <p className="mt-2 text-center text-muted-foreground">
        Denne siden er kun tilgjengelig for styret og håndverkere.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="din@epost.no"
          className="h-10 w-full rounded-3xl bg-input/50 px-4 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        {error && (
          <p className="rounded-2xl bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || email.trim().length === 0}
          className="h-10 w-full rounded-3xl bg-primary font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Sjekker …" : "Send engangskode"}
        </button>
      </form>
    </div>
  );
}

function ForbiddenScreen({ message, onLogout }: { message: string; onLogout: () => void }) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium">Ingen tilgang</h1>
      <p className="mt-2 text-muted-foreground">{message}</p>
      <button
        type="button"
        onClick={onLogout}
        className="mt-6 rounded-full border border-border px-6 py-2 font-medium hover:bg-muted"
      >
        Logg ut og prøv en annen e-post
      </button>
    </div>
  );
}

type Props = {
  children: ReactNode;
  /** Optional custom renderer per state — used by tests. */
  render?: (state: AuthState, children: ReactNode) => ReactNode;
};

export function RequireAuth({ children }: Props) {
  const { state, login, logout } = useAuth();

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "unauthenticated") return <UnauthenticatedScreen onLogin={login} />;
  if (state.status === "forbidden")
    return <ForbiddenScreen message={state.message} onLogout={logout} />;
  return <>{children}</>;
}

type RoleProps = {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
};

export function RequireRole({ roles, children, fallback }: RoleProps) {
  const { state } = useAuth();
  if (state.status !== "authenticated") return <LoadingScreen />;
  if (!roles.includes(state.user.role)) {
    return (
      fallback ?? (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="font-heading text-2xl font-medium">Mangler tilgang</h1>
          <p className="mt-2 text-muted-foreground">
            Denne siden er forbeholdt {roles.map(roleLabel).join(" og ")}.
          </p>
        </div>
      )
    );
  }
  return <>{children}</>;
}

function roleLabel(role: UserRole): string {
  return role === "board" ? "styret" : "håndverkere";
}
