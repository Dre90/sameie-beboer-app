import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ActivitiesAdmin } from "./ActivitiesAdmin";

const listMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    activities: {
      list: () => listMock(),
      create: (...a: unknown[]) => createMock(...a),
      update: (...a: unknown[]) => updateMock(...a),
    },
  },
}));

afterEach(() => vi.clearAllMocks());

function renderPage() {
  return render(
    <MemoryRouter>
      <ActivitiesAdmin />
    </MemoryRouter>,
  );
}

describe("ActivitiesAdmin", () => {
  test("creates an activity", async () => {
    listMock.mockResolvedValue({ activities: [] });
    createMock.mockResolvedValue({});
    renderPage();
    await screen.findByText(/Ingen aktiviteter ennå/i);
    await userEvent.type(screen.getByPlaceholderText(/Tittel/), "Luftfilter");
    await userEvent.type(screen.getByPlaceholderText(/Beskrivelse/), "Årlig");
    await userEvent.click(screen.getByRole("button", { name: /opprett/i }));
    expect(createMock).toHaveBeenCalledWith({
      title: "Luftfilter",
      description: "Årlig",
      status: "active",
    });
  });

  test("updates activity status", async () => {
    listMock.mockResolvedValue({
      activities: [
        {
          id: 1,
          title: "X",
          description: null,
          status: "active",
          deadline: null,
          created_at: "",
        },
      ],
    });
    updateMock.mockResolvedValue({});
    renderPage();
    await screen.findByText("X");
    await userEvent.selectOptions(screen.getByLabelText(/Status for X/), "done");
    expect(updateMock).toHaveBeenCalledWith(1, { status: "done" });
  });

  test("shows error on list failure", async () => {
    listMock.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(await screen.findByRole("alert")).toHaveTextContent("boom");
  });
});
