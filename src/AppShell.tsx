import { Link, NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900">
        <Link to="/" className="text-lg font-bold">
          Sameie
        </Link>
        <nav className="flex gap-2 text-sm">
          <NavLink
            to="/kart"
            className="rounded px-3 py-1.5 text-slate-600 hover:bg-slate-100 aria-[current=page]:bg-purple-600 aria-[current=page]:text-white dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Kart
          </NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
