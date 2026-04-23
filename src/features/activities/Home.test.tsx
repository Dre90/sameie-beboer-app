import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Home } from "./Home";
import { AuthProvider, RequireAuth } from "@/features/auth";
import type { Activity, AuthUser } from "@/lib/api-types";

const board: AuthUser = {
  email: "b@x",
  name: "Styret Medlem",
  role: "board",
  created_at: "",
};
const worker: AuthUser = { ...board, email: "w@x", role: "craftsman" };

const listMock = vi.fn();
vi.mock("@/lib/api-client", () => ({
  api: { activities: { list: () => listMock() } },
}));

afterEach(() => vi.clearAllMocks());

function renderHome(user: AuthUser) {
  return render(
    <AuthProvider fetchMe={() => Promise.resolve({ user })}>
      <MemoryRouter>
        <RequireAuth>
          <Home />
        </RequireAuth>
      </MemoryRouter>
    </AuthProvider>,
  );
}

const activity = (id: number, status: Activity["status"]): Activity => ({
  id,
  title: `Aktivitet ${id}`,
  description: null,
  status,
  deadline: null,
  created_at: "",
});

describe("Home", () => {
  test("greets user and shows only active activities", async () => {
    listMock.mockResolvedValue({
      activities: [activity(1, "active"), activity(2, "draft"), activity(3, "done")],
    });
    renderHome(board);
    expect(await screen.findByText(/Hei, Styret/)).toBeInTheDocument();
    expect(await screen.findByText("Aktivitet 1")).toBeInTheDocument();
    expect(screen.queryByText("Aktivitet 2")).not.toBeInTheDocument();
    expect(screen.queryByText("Aktivitet 3")).not.toBeInTheDocument();
  });

  test("craftsman doesn't see admin link", async () => {
    listMock.mockResolvedValue({ activities: [] });
    renderHome(worker);
    await screen.findByText(/Ingen aktive aktiviteter/);
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  test("board sees admin link", async () => {
    listMock.mockResolvedValue({ activities: [] });
    renderHome(board);
    expect(await screen.findByText("Admin")).toBeInTheDocument();
  });

  test("shows error on failure", async () => {
    listMock.mockRejectedValue(new Error("down"));
    renderHome(board);
    expect(await screen.findByRole("alert")).toHaveTextContent("down");
  });
});
