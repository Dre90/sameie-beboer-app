import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminShell } from "./AdminShell";

test("AdminShell renders tabs and outlet", () => {
  render(
    <MemoryRouter initialEntries={["/admin/brukere"]}>
      <Routes>
        <Route path="/admin" element={<AdminShell />}>
          <Route path="brukere" element={<div>BrukereInnhold</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("BrukereInnhold")).toBeInTheDocument();
  const tab = screen.getByRole("link", { name: "Brukere" });
  expect(tab).toHaveAttribute("aria-current", "page");
});
