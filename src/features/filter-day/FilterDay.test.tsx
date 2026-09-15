import { beforeEach, expect, test, vi } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { FilterDay } from "./FilterDay";
import { filterApi } from "@/lib/filter-api";
import { ApiError } from "@/lib/api";
import type { Role, UnitStatus } from "@/lib/filter-types";
import { allUnits } from "@/features/map/data/units";

let role: Role = "board";
const logout = vi.fn();
vi.mock("@/features/auth", () => ({
  useAuth: () => ({ state: { status: "authenticated", role }, logout }),
}));
vi.mock("@/lib/filter-api", () => ({
  filterApi: {
    overview: vi.fn(),
    setResponse: vi.fn(),
    setCompletion: vi.fn(),
  },
}));
let units: UnitStatus[];
beforeEach(() => {
  vi.resetAllMocks();
  role = "board";
  units = allUnits.map((unit) => ({
    id: unit.id,
    response: "unanswered",
    completion: "pending",
    version: 0,
    updated_at: "2026-09-15T12:00:00Z",
  }));
  vi.mocked(filterApi.overview).mockImplementation(async () => ({
    units,
    eventDate: "2026-10-01",
    fetchedAt: "2026-09-15T12:00:00Z",
  }));
});
async function select(id = "B24") {
  await userEvent.click((await screen.findAllByRole("button", { name: id }))[0]);
  return within(await screen.findByTestId(`unit-panel-${id}`));
}

test.each(["board", "craftsman"] as Role[])(
  "%s overview and details have no automated accessibility violations",
  async (activeRole) => {
    role = activeRole;
    render(<FilterDay />);
    await screen.findByText("0 av 47 leiligheter fullført");
    const options = { rules: { "color-contrast": { enabled: false } } };
    expect((await axe.run(document.body, options)).violations).toEqual([]);
    await select();
    expect((await axe.run(document.body, options)).violations).toEqual([]);
  },
);
test("shows map, progress, date and board export", async () => {
  render(<FilterDay />);
  expect(await screen.findByText("0 av 47 leiligheter fullført")).toBeInTheDocument();
  expect(screen.getByText("2026-10-01")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Last ned reserveoversikt" })).toHaveAttribute(
    "href",
    "/api/export",
  );
  expect(screen.getByRole("link", { name: "Last ned reserveoversikt" })).toHaveClass("size-10");
  expect(screen.getByRole("button", { name: "Hent ny status" })).toHaveClass("size-10");
  expect(screen.getByRole("button", { name: "Logg ut" })).toHaveClass("size-10");
});
test("legend uses the map color tokens for every status", async () => {
  render(<FilterDay />);
  await screen.findByText("0 av 47 leiligheter fullført");
  const legend = screen.getByRole("list", { name: "Tegnforklaring" });
  for (const tone of ["done", "home", "consent"] as const) {
    expect(legend.querySelector(`[data-tone="${tone}"]`)).toHaveClass(
      `data-[tone=${tone}]:bg-map-${tone}`,
    );
  }
  expect(legend.querySelector('[data-tone="self_service"]')).toHaveClass("bg-map-self-service");
  expect(legend.querySelector('[data-tone="unanswered"]')?.getAttribute("class")).toContain(
    "var(--color-map-unanswered)",
  );
});

test("board explicitly saves a response", async () => {
  vi.mocked(filterApi.setResponse).mockResolvedValue({
    unit: { ...units[0], id: "B24", response: "home", version: 1 },
  });
  render(<FilterDay />);
  const panel = await select();
  await userEvent.click(panel.getByRole("button", { name: "Hjemme" }));
  expect(filterApi.setResponse).not.toHaveBeenCalled();
  await userEvent.click(panel.getByRole("button", { name: "Lagre svar" }));
  expect(filterApi.setResponse).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24", version: 0 }),
    "home",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
});

test("uses larger text controls and status chips in the unit panel", async () => {
  render(<FilterDay />);
  const panel = await select();
  expect(panel.getByRole("button", { name: "Lagre svar" })).toHaveClass("h-10", "text-base");
  expect(panel.getByRole("button", { name: "Lagre svar" })).toHaveClass("hover:bg-primary");
  expect(panel.getByRole("button", { name: "Lagre svar" })).not.toHaveClass("hover:bg-primary/80");
  expect(panel.getByRole("button", { name: "Hjemme" })).toHaveClass("h-10", "text-base");
  expect(panel.getByText("Ikke utført")).toHaveClass("h-10", "text-sm");
  await userEvent.click(panel.getByRole("button", { name: "Samtykke" }));
  expect(panel.getByRole("button", { name: "Lagre svar" })).toBeEnabled();
});
test("craftsman cannot edit responses or export, but can mark delivered", async () => {
  role = "craftsman";
  units = units.map((unit) => (unit.id === "B24" ? { ...unit, response: "self_service" } : unit));
  vi.mocked(filterApi.setCompletion).mockResolvedValue({
    unit: {
      ...units[0],
      id: "B24",
      response: "self_service",
      completion: "delivered",
      version: 1,
    },
  });
  vi.mocked(filterApi.overview).mockResolvedValueOnce({
    units,
    eventDate: null,
    fetchedAt: "2026-09-15T12:00:00Z",
  });
  units = units.map((unit) =>
    unit.id === "B24" ? { ...unit, completion: "delivered", version: 1 } : unit,
  );
  render(<FilterDay />);
  const panel = await select();
  expect(panel.queryByRole("button", { name: "Lagre svar" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Last ned reserveoversikt" })).not.toBeInTheDocument();
  await userEvent.click(panel.getByRole("button", { name: "Levert på døra" }));
  expect(await screen.findByText("1 av 47 leiligheter fullført")).toBeInTheDocument();
});
test("undo requires confirmation and can be cancelled", async () => {
  role = "craftsman";
  units = units.map((unit) => (unit.id === "B24" ? { ...unit, completion: "performed" } : unit));
  vi.mocked(filterApi.setCompletion).mockResolvedValue({
    unit: { ...units[0], id: "B24", version: 1 },
  });
  render(<FilterDay />);
  const panel = await select();
  await userEvent.click(panel.getByRole("button", { name: "Angre ferdigmarkering" }));
  await userEvent.click(screen.getByRole("button", { name: "Avbryt" }));
  expect(filterApi.setCompletion).not.toHaveBeenCalled();
  await userEvent.click(panel.getByRole("button", { name: "Angre ferdigmarkering" }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Angre ferdigmarkering",
    }),
  );
  expect(filterApi.setCompletion).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24" }),
    "pending",
  );
});
test("conflicts stop writes until fresh status is fetched", async () => {
  vi.mocked(filterApi.setCompletion).mockRejectedValue(new ApiError(409, {}, "Conflict"));
  render(<FilterDay />);
  const panel = await select();
  await userEvent.click(panel.getByRole("button", { name: "Marker utført" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("En annen har endret");
  expect(panel.getByRole("button", { name: "Marker utført" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Hent ny status" }));
  expect(panel.getByRole("button", { name: "Marker utført" })).toBeEnabled();
});
test("network errors never report a successful save", async () => {
  vi.mocked(filterApi.setCompletion).mockRejectedValue(new TypeError("offline"));
  render(<FilterDay />);
  const panel = await select();
  await userEvent.click(panel.getByRole("button", { name: "Marker utført" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Lagring kunne ikke bekreftes");
  expect(screen.queryByText("B24: Lagret")).not.toBeInTheDocument();
});
test("load errors are retryable and logout failures are visible", async () => {
  vi.mocked(filterApi.overview).mockRejectedValueOnce(new Error("Offline"));
  logout.mockRejectedValue(new Error("Offline"));
  render(<FilterDay />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Offline");
  await userEvent.click(screen.getByRole("button", { name: "Hent ny status" }));
  await screen.findByText("0 av 47 leiligheter fullført");
  await userEvent.click(screen.getByRole("button", { name: "Logg ut" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Utlogging feilet");
});

test("refreshes other units after saving and blocks writes if that refresh fails", async () => {
  vi.mocked(filterApi.setCompletion).mockImplementation(async () => {
    units = units.map((unit) =>
      unit.id === "B24" || unit.id === "B25"
        ? { ...unit, completion: "performed", version: 1 }
        : unit,
    );
    return { unit: units.find((unit) => unit.id === "B24")! };
  });
  render(<FilterDay />);
  let panel = await select();
  await userEvent.click(panel.getByRole("button", { name: "Marker utført" }));
  expect(await screen.findByText("2 av 47 leiligheter fullført")).toBeInTheDocument();
  expect(filterApi.overview).toHaveBeenCalledTimes(2);
  panel = within(screen.getByTestId("unit-panel-B24"));
  vi.mocked(filterApi.overview).mockRejectedValueOnce(new Error("offline"));
  await userEvent.click(panel.getByRole("button", { name: "Angre ferdigmarkering" }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", {
      name: "Angre ferdigmarkering",
    }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Endringen er lagret");
  expect(
    within(screen.getByTestId("unit-panel-B24")).getByRole("button", {
      name: "Angre ferdigmarkering",
    }),
  ).toBeDisabled();
});
