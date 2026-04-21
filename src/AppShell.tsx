import { Link, NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AppShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4">
        <Link to="/" className="font-heading text-lg font-medium">
          Sameie
        </Link>
        <nav className="flex gap-1 text-sm">
          <NavLink
            to="/kart"
            className={({ isActive }) =>
              cn(
                "rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
              )
            }
          >
            Kart
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
