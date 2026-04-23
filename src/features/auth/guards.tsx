import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
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
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium">Logg inn</h1>
      <p className="mt-2 text-muted-foreground">
        Denne siden er kun tilgjengelig for styret og håndverkere. Logg inn med registrert e-post.
      </p>
      <button
        type="button"
        onClick={onLogin}
        className="mt-6 rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
      >
        Logg inn med Cloudflare Access
      </button>
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
