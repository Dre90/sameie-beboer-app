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
const unitGetMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    activities: {
      list: () => listMock(),
      status: (...args: unknown[]) => statusMock(...args),
      setResponse: (...args: unknown[]) => setResponseMock(...args),
      complete: (...args: unknown[]) => completeMock(...args),
      undoComplete: (...args: unknown[]) => undoMock(...args),
    },
    units: {
      get: (...args: unknown[]) => unitGetMock(...args),
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
  unitGetMock.mockResolvedValue({
    unit: {
      id: "B24",
      is_rented: false,
      owner_name: null,
      owner_email: null,
      owner_phone: null,
      updated_at: "",
      residents: [],
    },
    residents: [],
  });
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

async function selectUnit(id: string) {
  // Each unit has a button in the list; clicking it opens the info panel.
  const buttons = await screen.findAllByRole("button", { name: id });
  await userEvent.click(buttons[0]);
  return await screen.findByTestId(`unit-panel-${id}`);
}

describe("ActivityDetail", () => {
  test("shows progress and renders the map", async () => {
    seed();
    renderDetail(board);
    expect(await screen.findByText("Bytte luftfilter")).toBeInTheDocument();
    expect(screen.getByText(/0 av \d+ leiligheter/)).toBeInTheDocument();
    expect(screen.getByLabelText("Tegnforklaring")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "B24" }).length).toBeGreaterThan(0);
  });

  test("clicking a unit opens the info panel with location", async () => {
    seed();
    renderDetail(board);
    const panel = await selectUnit("B24");
    expect(within(panel).getByRole("heading", { level: 2, name: "B24" })).toBeInTheDocument();
    expect(within(panel).getByText(/bygg b/i)).toBeInTheDocument();
  });

  test("activity panel shows residents and rental info from /admin/leiligheter", async () => {
    seed();
    unitGetMock.mockResolvedValue({
      unit: {
        id: "B24",
        is_rented: true,
        owner_name: "Kari Eier",
        owner_email: "kari@x",
        owner_phone: "99999999",
        updated_at: "",
        residents: [],
      },
      residents: [
        {
          id: 1,
          unit_id: "B24",
          name: "Per Beboer",
          email: "per@x",
          phone: "12345678",
          created_at: "",
        },
      ],
    });
    renderDetail(board);
    const panel = await selectUnit("B24");
    expect(await within(panel).findByText("Per Beboer")).toBeInTheDocument();
    expect(within(panel).getByText("12345678")).toBeInTheDocument();
    expect(within(panel).getByText("Kari Eier")).toBeInTheDocument();
  });

  test("board can set a response", async () => {
    seed();
    setResponseMock.mockResolvedValue({});
    renderDetail(board);
    const panel = await selectUnit("B24");
    await userEvent.click(within(panel).getByRole("button", { name: "Hjemme" }));
    expect(setResponseMock).toHaveBeenCalledWith(1, "B24", { response: "home" });
  });

  test("craftsman does not see response controls", async () => {
    seed();
    renderDetail(worker);
    const panel = await selectUnit("B24");
    expect(within(panel).queryByRole("button", { name: "Hjemme" })).not.toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Marker utført" })).toBeInTheDocument();
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
    const panel = await selectUnit("B24");
    expect(within(panel).getByRole("button", { name: /levert på døra/i })).toBeInTheDocument();
  });

  test("marking complete calls API", async () => {
    seed();
    completeMock.mockResolvedValue({});
    renderDetail(worker);
    const panel = await selectUnit("B24");
    await userEvent.click(within(panel).getByRole("button", { name: "Marker utført" }));
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
    const panel = await selectUnit("B24");
    expect(within(panel).queryByRole("button", { name: "Angre" })).not.toBeInTheDocument();
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
    const panel = await selectUnit("B24");
    await userEvent.click(within(panel).getByRole("button", { name: "Angre" }));
    expect(undoMock).toHaveBeenCalledWith(1, "B24");
  });

  test("map rectangles reflect tone for completion and response", async () => {
    seed(
      [
        {
          activity_id: 1,
          unit_id: "B24",
          response: "home",
          note: null,
          updated_at: "",
        },
      ],
      [
        {
          activity_id: 1,
          unit_id: "B21",
          completed_by_email: "w@x",
          completion_type: "performed",
          notes: null,
          completed_at: "",
        },
      ],
    );
    const { container } = renderDetail(board);
    await screen.findByText("Bytte luftfilter");
    // B24 / B21 are on floor 2 — switch to that floor so their rects render.
    await userEvent.click(screen.getAllByRole("tab", { name: "2. etg" })[0]);
    const rects = container.querySelectorAll<SVGRectElement>("rect[data-tone]");
    const tones = new Map<string, string>();
    rects.forEach((r) => {
      const id = r.parentElement?.querySelector("text")?.textContent;
      if (id) tones.set(id, r.getAttribute("data-tone") ?? "");
    });
    expect(tones.get("B24")).toBe("home");
    expect(tones.get("B21")).toBe("done");
  });

  test("shows not-found when activity missing", async () => {
    listMock.mockResolvedValue({ activities: [] });
    statusMock.mockResolvedValue({ responses: [], completions: [] });
    renderDetail(board);
    expect(await screen.findByText(/ikke funnet/i)).toBeInTheDocument();
  });
});
