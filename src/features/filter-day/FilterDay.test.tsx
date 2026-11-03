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
    setComment: vi.fn(),
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
    board_comment: "",
    craftsman_comment: "",
    version: 0,
    updated_at: "2026-09-15T12:00:00Z",
  }));
  vi.mocked(filterApi.overview).mockImplementation(async () => ({
    units,
    eventDate: "2026-10-01",
    fetchedAt: "2026-09-15T12:00:00Z",
  }));
});
async function select(id = "B24", name = id) {
  await userEvent.click((await screen.findAllByRole("button", { name }))[0]);
  return within(await screen.findByTestId(`unit-panel-${id}`));
}
function withComments(id: string, comments: Partial<UnitStatus>) {
  units = units.map((unit) => (unit.id === id ? { ...unit, ...comments } : unit));
}
async function storeUpdate(unit: UnitStatus, changes: Partial<UnitStatus>) {
  units = units.map((existing) =>
    existing.id === unit.id ? { ...existing, ...changes, version: existing.version + 1 } : existing,
  );
  return { unit: units.find((existing) => existing.id === unit.id)! };
}

test.each(["board", "craftsman"] as Role[])(
  "%s overview and details have no automated accessibility violations",
  async (activeRole) => {
    role = activeRole;
    withComments("B24", { board_comment: "Hund i bur", craftsman_comment: "Ingen åpnet" });
    render(<FilterDay />);
    await screen.findByText("0 av 47 leiligheter fullført");
    const options = { rules: { "color-contrast": { enabled: false } } };
    expect((await axe.run(document.body, options)).violations).toEqual([]);
    await select("B24", "B24, har kommentar");
    expect(screen.getByRole("note")).toBeInTheDocument();
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
  expect(within(legend).getByText("Har kommentar")).toContainElement(
    screen.getByTestId("legend-comment-marker"),
  );
  expect(screen.getByTestId("legend-comment-marker")).toHaveClass("rounded-full", "bg-foreground");
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

test("uses larger text controls and high-contrast status chips in the unit panel", async () => {
  render(<FilterDay />);
  const panel = await select();
  expect(panel.getByRole("button", { name: "Lagre svar" })).toHaveClass("h-10", "text-base");
  expect(panel.getByRole("button", { name: "Lagre svar" })).toHaveClass("hover:bg-primary");
  expect(panel.getByRole("button", { name: "Lagre svar" })).not.toHaveClass("hover:bg-primary/80");
  expect(panel.getByRole("button", { name: "Hjemme" })).toHaveClass("h-10", "text-base");
  expect(panel.getByText("Ikke utført")).toHaveClass("h-10", "text-sm");
  expect(panel.getByText("Ikke utført")).toHaveClass("border-control-border");
  expect(panel.getByText("Mangler svar", { selector: "[data-slot=badge]" })).toHaveClass(
    "border-control-border",
  );
  const consent = panel.getByRole("button", { name: "Samtykke" });
  expect(consent).toHaveClass("border-control-border", "aria-pressed:bg-primary");
  expect(consent).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(consent);
  expect(consent).toHaveAttribute("aria-pressed", "true");
  expect(panel.getByRole("button", { name: "Lagre svar" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "Kommentar fra styret" })).toHaveClass(
    "border-control-border",
  );
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

function persistWrites() {
  vi.mocked(filterApi.setResponse).mockImplementation((unit, response) =>
    storeUpdate(unit, { response }),
  );
  vi.mocked(filterApi.setComment).mockImplementation((unit, field, text) =>
    storeUpdate(unit, { [field]: text }),
  );
}
function commentMarkers(id: string) {
  return [
    ...screen.queryAllByRole("button", { name: `${id}, har kommentar`, hidden: true }),
    ...screen.queryAllByRole("button", {
      name: new RegExp(`^Leilighet ${id}, .+, har kommentar$`),
      hidden: true,
    }),
  ];
}

test("board saves a comment without losing an unsaved response choice", async () => {
  persistWrites();
  render(<FilterDay />);
  const panel = await select();
  expect(commentMarkers("B24")).toEqual([]);
  await userEvent.click(panel.getByRole("button", { name: "Hjemme" }));
  await userEvent.type(
    screen.getByRole("textbox", { name: "Kommentar fra styret" }),
    "  Hund i bur ",
  );
  await userEvent.click(screen.getByRole("button", { name: "Lagre kommentar" }));
  expect(filterApi.setComment).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24", version: 0 }),
    "board_comment",
    "Hund i bur",
  );
  expect(filterApi.setResponse).not.toHaveBeenCalled();
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
  const saved = within(screen.getByTestId("unit-panel-B24"));
  expect(saved.getByRole("button", { name: "Hjemme" })).toHaveAttribute("aria-pressed", "true");
  expect(saved.getByRole("button", { name: "Lagre svar" })).toBeEnabled();
  expect(screen.getByRole("textbox", { name: "Kommentar fra styret" })).toHaveValue("Hund i bur");
  expect(screen.getByRole("button", { name: "Lagre kommentar" })).toBeDisabled();
  expect(commentMarkers("B24")).toHaveLength(2);
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
});

test("an unsaved comment survives saving the response and is saved with the new version", async () => {
  persistWrites();
  render(<FilterDay />);
  const panel = await select();
  await userEvent.type(screen.getByRole("textbox", { name: "Kommentar fra styret" }), "Hund i bur");
  await userEvent.click(panel.getByRole("button", { name: "Hjemme" }));
  await userEvent.click(panel.getByRole("button", { name: "Lagre svar" }));
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
  expect(filterApi.setComment).not.toHaveBeenCalled();
  expect(
    within(screen.getByTestId("unit-panel-B24")).getByRole("button", { name: "Lagre svar" }),
  ).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Kommentar fra styret" })).toHaveValue("Hund i bur");
  await userEvent.click(screen.getByRole("button", { name: "Lagre kommentar" }));
  expect(filterApi.setComment).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24", response: "home", version: 1 }),
    "board_comment",
    "Hund i bur",
  );
});

test("craftsman reads the board's comment first and sends a message to the board", async () => {
  role = "craftsman";
  withComments("B24", { board_comment: "Hund i bur" });
  persistWrites();
  render(<FilterDay />);
  await screen.findByText("0 av 47 leiligheter fullført");
  // Floor 1 is shown first, so only the list marks B24 until it is selected.
  expect(commentMarkers("B24")).toHaveLength(1);
  await select("B24", "B24, har kommentar");
  const note = screen.getByRole("note", { name: "Kommentar fra styret" });
  expect(note).toHaveTextContent("Hund i bur");
  expect(
    note.compareDocumentPosition(screen.getByTestId("unit-panel-B24")) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(within(note).queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "Kommentar fra styret" })).not.toBeInTheDocument();
  await userEvent.type(
    screen.getByRole("textbox", { name: "Beskjed til styret" }),
    "Ingen åpnet, la lapp",
  );
  await userEvent.click(screen.getByRole("button", { name: "Lagre beskjed" }));
  expect(filterApi.setComment).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24" }),
    "craftsman_comment",
    "Ingen åpnet, la lapp",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
  expect(screen.getByRole("note", { name: "Kommentar fra styret" })).toHaveTextContent(
    "Hund i bur",
  );
  expect(screen.getByRole("textbox", { name: "Beskjed til styret" })).toHaveValue(
    "Ingen åpnet, la lapp",
  );
});

test("board clears the craftsman's message and the comment marker disappears", async () => {
  withComments("B24", { craftsman_comment: "Ingen åpnet" });
  persistWrites();
  render(<FilterDay />);
  await select("B24", "B24, har kommentar");
  expect(commentMarkers("B24")).toHaveLength(2);
  const note = screen.getByRole("note", { name: "Beskjed fra håndverker" });
  expect(note).toHaveTextContent("Ingen åpnet");
  await userEvent.click(within(note).getByRole("button", { name: "Tøm beskjed" }));
  await userEvent.click(
    within(screen.getByRole("alertdialog")).getByRole("button", { name: "Tøm beskjed" }),
  );
  expect(filterApi.setComment).toHaveBeenCalledWith(
    expect.objectContaining({ id: "B24", version: 0 }),
    "craftsman_comment",
    "",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
  expect(screen.queryByRole("note")).not.toBeInTheDocument();
  expect(commentMarkers("B24")).toEqual([]);
  expect(screen.getByRole("button", { name: "B24", hidden: true })).toBeInTheDocument();
});

test("a comment draft survives a conflict and is saved after fetching fresh status", async () => {
  persistWrites();
  vi.mocked(filterApi.setComment).mockRejectedValueOnce(new ApiError(409, {}, "Conflict"));
  render(<FilterDay />);
  await select();
  await userEvent.type(screen.getByRole("textbox", { name: "Kommentar fra styret" }), "Hund i bur");
  // Meanwhile the craftsman marks the unit as done.
  units = units.map((unit) =>
    unit.id === "B24" ? { ...unit, completion: "performed", version: 1 } : unit,
  );
  await userEvent.click(screen.getByRole("button", { name: "Lagre kommentar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("En annen har endret");
  expect(screen.getByRole("button", { name: "Lagre kommentar" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Hent ny status" }));
  expect(await screen.findByText("Utført", { selector: "[data-slot=badge]" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Kommentar fra styret" })).toHaveValue("Hund i bur");
  await userEvent.click(screen.getByRole("button", { name: "Lagre kommentar" }));
  expect(filterApi.setComment).toHaveBeenLastCalledWith(
    expect.objectContaining({ id: "B24", completion: "performed", version: 1 }),
    "board_comment",
    "Hund i bur",
  );
  expect(await screen.findByRole("status")).toHaveTextContent("B24: Lagret");
});
