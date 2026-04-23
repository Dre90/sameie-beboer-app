import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

export function AdminShell() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header>
        <h1 className="font-heading text-2xl font-medium">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Administrer brukere, leiligheter og aktiviteter.
        </p>
      </header>
      <nav className="flex gap-1 border-b border-border text-sm">
        <AdminTab to="/admin/brukere">Brukere</AdminTab>
        <AdminTab to="/admin/leiligheter">Leiligheter</AdminTab>
        <AdminTab to="/admin/aktiviteter">Aktiviteter</AdminTab>
      </nav>
      <Outlet />
    </div>
  );
}

function AdminTab({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "-mb-px border-b-2 border-transparent px-4 py-2 text-muted-foreground transition-colors hover:text-foreground",
          isActive && "border-primary text-foreground",
        )
      }
    >
      {children}
    </NavLink>
  );
}
