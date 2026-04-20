import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";
import { App } from "./App.tsx";

const rootEl = document.querySelector<HTMLDivElement>("#app");
if (!rootEl) {
  throw new Error("Root element #app not found");
}

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
