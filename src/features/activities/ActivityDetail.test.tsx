import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ActivityDetail } from "./ActivityDetail";
import { AuthProvider, RequireAuth } from "@/features/auth";
import type { Activity, ActivityCompletion, ActivityResponse, AuthUser } from "@/lib/api-types";

const board: AuthUser = {
  email: "b@x",
  name: "Styret",
  role: "board",
  created_at: "",
};
const worker: AuthUser = { ...board, email: "w@x", role: "craftsman" };

const listMock = vi.fn();
const statusMock = vi.fn();
const setResponseMock = vi.fn();
const completeMock = vi.fn();
const undoMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    activities: {
      list: () => listMock(),
      status: (...args: unknown[]) => statusMock(...args),
      setResponse: (...args: unknown[]) => setResponseMock(...args),
      complete: (...args: unknown[]) => completeMock(...args),
      undoComplete: (...args: unknown[]) => undoMock(...args),
    },
  },
}));

afterEach(() => vi.clearAllMocks());

const activity: Activity = {
  id: 1,
  title: "Bytte luftfilter",
  description: "Beskrivelse",
  status: "active",
  deadline: null,
  created_at: "",
};

function seed(responses: ActivityResponse[] = [], completions: ActivityCompletion[] = []) {
  listMock.mockResolvedValue({ activities: [activity] });
  statusMock.mockResolvedValue({ responses, completions });
}

function renderDetail(user: AuthUser) {
  return render(
    <AuthProvider fetchMe={() => Promise.resolve({ user })}>
      <MemoryRouter initialEntries={["/aktivitet/1"]}>
        <RequireAuth>
          <Routes>
            <Route path="/aktivitet/:id" element={<ActivityDetail />} />
          </Routes>
        </RequireAuth>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe("ActivityDetail", () => {
  test("shows progress and per-unit cards", async () => {
    seed();
    renderDetail(board);
    expect(await screen.findByText("Bytte luftfilter")).toBeInTheDocument();
    expect(screen.getByText(/0 av \d+ leiligheter/)).toBeInTheDocument();
    expect(screen.getByTestId("unit-card-B24")).toBeInTheDocument();
  });

  test("board can set a response", async () => {
    seed();
    setResponseMock.mockResolvedValue({});
    renderDetail(board);
    const card = await screen.findByTestId("unit-card-B24");
    await userEvent.click(within(card).getByRole("button", { name: "Hjemme" }));
    expect(setResponseMock).toHaveBeenCalledWith(1, "B24", { response: "home" });
  });

  test("craftsman does not see response controls", async () => {
    seed();
    renderDetail(worker);
    const card = await screen.findByTestId("unit-card-B24");
    expect(within(card).queryByRole("button", { name: "Hjemme" })).not.toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Marker utført" })).toBeInTheDocument();
  });

  test("self-service response shows 'Levert på døra' button", async () => {
    seed([
      {
        activity_id: 1,
        unit_id: "B24",
        response: "self_service",
        note: null,
        updated_at: "",
      },
    ]);
    renderDetail(worker);
    const card = await screen.findByTestId("unit-card-B24");
    expect(within(card).getByRole("button", { name: /levert på døra/i })).toBeInTheDocument();
  });

  test("marking complete calls API", async () => {
    seed();
    completeMock.mockResolvedValue({});
    renderDetail(worker);
    const card = await screen.findByTestId("unit-card-B24");
    await userEvent.click(within(card).getByRole("button", { name: "Marker utført" }));
    expect(completeMock).toHaveBeenCalledWith(1, "B24", {
      completion_type: "performed",
    });
  });

  test("can undo own completion but not others", async () => {
    seed(
      [],
      [
        {
          activity_id: 1,
          unit_id: "B24",
          completed_by_email: "other@x",
          completion_type: "performed",
          notes: null,
          completed_at: "",
        },
      ],
    );
    renderDetail(worker);
    const card = await screen.findByTestId("unit-card-B24");
    expect(within(card).queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
  });

  test("board can undo anyone's completion", async () => {
    seed(
      [],
      [
        {
          activity_id: 1,
          unit_id: "B24",
          completed_by_email: "other@x",
          completion_type: "performed",
          notes: null,
          completed_at: "",
        },
      ],
    );
    undoMock.mockResolvedValue({});
    renderDetail(board);
    const card = await screen.findByTestId("unit-card-B24");
    await userEvent.click(within(card).getByRole("button", { name: "Angre" }));
    expect(undoMock).toHaveBeenCalledWith(1, "B24");
  });

  test("shows not-found when activity missing", async () => {
    listMock.mockResolvedValue({ activities: [] });
    statusMock.mockResolvedValue({ responses: [], completions: [] });
    renderDetail(board);
    expect(await screen.findByText(/ikke funnet/i)).toBeInTheDocument();
  });
});
