import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitsAdmin } from "./UnitsAdmin";

const listMock = vi.fn();
const upsertMock = vi.fn();
const addResidentMock = vi.fn();
const removeResidentMock = vi.fn();

vi.mock("@/lib/api-client", () => ({
  api: {
    units: {
      list: () => listMock(),
      upsert: (...a: unknown[]) => upsertMock(...a),
      addResident: (...a: unknown[]) => addResidentMock(...a),
      removeResident: (...a: unknown[]) => removeResidentMock(...a),
    },
  },
}));

afterEach(() => vi.clearAllMocks());

describe("UnitsAdmin", () => {
  test("renders all provided unit IDs and existing residents", async () => {
    listMock.mockResolvedValue({
      units: [
        {
          id: "B24",
          is_rented: false,
          owner_name: null,
          owner_email: null,
          owner_phone: null,
          updated_at: "",
          residents: [
            {
              id: 1,
              unit_id: "B24",
              name: "Dag",
              email: null,
              phone: "999",
              created_at: "",
            },
          ],
        },
      ],
    });
    render(<UnitsAdmin unitIds={["B24", "B25"]} />);
    expect(await screen.findByText("B24")).toBeInTheDocument();
    expect(screen.getByText("Dag")).toBeInTheDocument();
    expect(screen.getByText("B25")).toBeInTheDocument();
  });

  test("expanding a unit lets you save rental info and add residents", async () => {
    listMock.mockResolvedValue({ units: [] });
    upsertMock.mockResolvedValue({});
    addResidentMock.mockResolvedValue({});
    render(<UnitsAdmin unitIds={["B24"]} />);

    const card = await screen.findByText("B24");
    await userEvent.click(
      within(card.closest("div")!.parentElement!).getByRole("button", { name: /rediger/i }),
    );

    await userEvent.click(screen.getByLabelText("Utleid"));
    await userEvent.type(screen.getByPlaceholderText("Eier navn"), "Eier");
    await userEvent.click(screen.getByRole("button", { name: /lagre leilighet/i }));
    expect(upsertMock).toHaveBeenCalledWith("B24", {
      is_rented: true,
      owner_name: "Eier",
      owner_email: null,
      owner_phone: null,
    });

    await userEvent.type(screen.getByPlaceholderText("Navn"), "Ny Beboer");
    await userEvent.click(screen.getByRole("button", { name: /legg til beboer/i }));
    expect(addResidentMock).toHaveBeenCalledWith("B24", {
      name: "Ny Beboer",
      email: null,
      phone: null,
    });
  });

  test("shows error on load failure", async () => {
    listMock.mockRejectedValue(new Error("down"));
    render(<UnitsAdmin unitIds={[]} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("down");
  });
});
