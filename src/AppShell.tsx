import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth";

export function AppShell() {
  const { state, logout } = useAuth();
  const authenticated = state.status === "authenticated";
  const isBoard = authenticated && state.user.role === "board";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4">
        <Link to="/" className="font-heading text-lg font-medium">
          Sameie
        </Link>
        <nav className="flex gap-1 text-sm">
          <NavLink to="/kart" className={navLinkClass}>
            Kart
          </NavLink>
          {isBoard && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>
        {authenticated && (
          <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
            <span aria-label="Innlogget som">{state.user.name}</span>
            <button
              type="button"
              onClick={logout}
              className="rounded-full border border-border px-3 py-1 text-foreground hover:bg-muted"
            >
              Logg ut
            </button>
          </div>
        )}
      </header>
      <Outlet />
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
  );
}
