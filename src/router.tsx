import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { SiteMap } from "./features/map";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppShell,
    children: [
      { index: true, element: <Navigate to="/kart" replace /> },
      { path: "kart", Component: SiteMap },
    ],
  },
]);
