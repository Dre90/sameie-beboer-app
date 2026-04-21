import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";

function renderShell(initialEntries: string[] = ["/kart"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route path="kart" element={<div>Kart-innhold</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

test("renders brand and nav link to map", () => {
  renderShell();
  expect(screen.getByRole("link", { name: "Sameie" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Kart" })).toHaveAttribute("href", "/kart");
});

test("nav link is marked as current when route matches", () => {
  renderShell(["/kart"]);
  const link = screen.getByRole("link", { name: "Kart" });
  expect(link).toHaveAttribute("aria-current", "page");
});

test("renders outlet content", () => {
  renderShell();
  expect(screen.getByText("Kart-innhold")).toBeInTheDocument();
});
