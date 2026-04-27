import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { AppShell } from "./AppShell";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import { RequireAuth, RequireRole } from "@/features/auth";
import { SiteMap } from "@/features/map";
import { ActivityDetail, Home } from "@/features/activities";
import { allUnits } from "@/features/map/data/units";
import { ActivitiesAdmin, AdminShell, UnitsAdmin, UsersAdmin } from "@/features/admin";

const unitIds = allUnits.map((u) => u.id);

function RequireAuthOutlet() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}

function BoardAdminLayout() {
  return (
    <RequireRole roles={["board"]}>
      <AdminShell />
    </RequireRole>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        element: <RequireAuthOutlet />,
        children: [
          { index: true, Component: Home },
          { path: "kart", Component: SiteMap },
          { path: "aktivitet/:id", Component: ActivityDetail },
          {
            path: "admin",
            element: <BoardAdminLayout />,
            children: [
              { index: true, element: <Navigate to="/admin/brukere" replace /> },
              { path: "brukere", Component: UsersAdmin },
              {
                path: "leiligheter",
                element: <UnitsAdmin unitIds={unitIds} />,
              },
              { path: "aktiviteter", Component: ActivitiesAdmin },
            ],
          },
        ],
      },
    ],
  },
]);
