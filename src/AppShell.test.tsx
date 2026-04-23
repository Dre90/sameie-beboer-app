import { expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppShell } from "./AppShell";
import { AuthProvider } from "@/features/auth";
import type { AuthUser } from "@/lib/api-types";

function renderShell(
  initialEntries: string[] = ["/kart"],
  opts: {
    fetchMe?: () => Promise<{ user: AuthUser }>;
    navigate?: (url: string) => void;
  } = {},
) {
  const fetchMe = opts.fetchMe ?? (() => Promise.reject(new Error("unauth")));
  return render(
    <AuthProvider fetchMe={fetchMe} navigate={opts.navigate}>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route path="kart" element={<div>Kart-innhold</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

test("renders brand and nav link to map", async () => {
  renderShell();
  expect(screen.getByRole("link", { name: "Sameie" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "Kart" })).toHaveAttribute("href", "/kart");
  expect(await screen.findByText("Kart-innhold")).toBeInTheDocument();
});

test("nav link is marked as current when route matches", () => {
  renderShell(["/kart"]);
  const link = screen.getByRole("link", { name: "Kart" });
  expect(link).toHaveAttribute("aria-current", "page");
});

test("shows admin nav + logout when authenticated as board", async () => {
  const navigate = vi.fn();
  renderShell(["/kart"], {
    fetchMe: () =>
      Promise.resolve({
        user: {
          email: "b@x",
          name: "Styret",
          role: "board",
          created_at: "",
        },
      }),
    navigate,
  });
  expect(await screen.findByRole("link", { name: "Admin" })).toBeInTheDocument();
  expect(screen.getByLabelText("Innlogget som")).toHaveTextContent("Styret");
  await userEvent.click(screen.getByRole("button", { name: /logg ut/i }));
  expect(navigate).toHaveBeenCalledWith("/cdn-cgi/access/logout");
});

test("hides admin nav for craftsman", async () => {
  renderShell(["/kart"], {
    fetchMe: () =>
      Promise.resolve({
        user: {
          email: "w@x",
          name: "Håndverker",
          role: "craftsman",
          created_at: "",
        },
      }),
  });
  await screen.findByLabelText("Innlogget som");
  expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
});
