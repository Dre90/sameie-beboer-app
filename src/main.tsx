import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./style.css";
import { router } from "./router";
import { AuthProvider } from "@/features/auth";

const rootEl = document.querySelector<HTMLDivElement>("#app");
if (!rootEl) {
  throw new Error("Root element #app not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>,
);
