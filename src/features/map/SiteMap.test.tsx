import { expect, test, vi } from "vite-plus/test";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteMap } from "./SiteMap";

test("renders floor tabs and unit list", () => {
  render(<SiteMap />);
  expect(screen.getAllByRole("tab", { name: "1. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("tab", { name: "2. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("tab", { name: "3. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "A11" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "B36" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "C1" }).length).toBeGreaterThan(0);
  expect(
    screen.getByRole("group", { name: "Etasjeplan 1. etasje" }).closest(".top-18"),
  ).toHaveClass("xl:top-0");
});

test("selecting unit from list opens info panel", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  await user.click(screen.getAllByRole("button", { name: "A11" })[0]);
  expect(screen.getByRole("heading", { level: 2, name: "A11" })).toBeInTheDocument();
});

test("selecting B-unit switches to its floor", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  const floor3Tabs = screen.getAllByRole("tab", { name: "3. etg" });
  expect(floor3Tabs[0]).toHaveAttribute("aria-selected", "false");
  await user.click(screen.getAllByRole("button", { name: "B31" })[0]);
  expect(floor3Tabs[0]).toHaveAttribute("aria-selected", "true");
});

test("search filters unit list", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  const search = screen.getAllByRole("searchbox")[0];
  await user.type(search, "B2");
  expect(screen.queryAllByRole("button", { name: "A11" })).toHaveLength(0);
  expect(screen.getAllByRole("button", { name: "B21" }).length).toBeGreaterThan(0);
});

test("opening the mobile list button exposes the list sheet", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  await user.click(screen.getByRole("button", { name: "Åpne liste" }));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Leiligheter" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Lukk" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("selecting a townhouse shows the rekkehus label", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  await user.click(screen.getAllByRole("button", { name: "C3" })[0]);
  expect(screen.getByText("Rekkehus C (alle etasjer)")).toBeInTheDocument();
});

test("returns focus to the list menu after closing mobile details", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  const menu = screen.getByRole("button", { name: "Åpne liste" });
  await user.click(menu);
  await user.click(
    within(screen.getByRole("dialog", { name: "Leiligheter" })).getByRole("button", {
      name: "A11",
    }),
  );
  const details = await screen.findByRole("dialog", { name: "Leilighet A11" });
  await user.click(within(details).getByRole("button", { name: "Lukk" }));
  await waitFor(() => expect(menu).toHaveFocus());
});

test("renderUnitInfo overrides the default info panel", async () => {
  const user = userEvent.setup();
  render(
    <SiteMap renderUnitInfo={(unit) => <p data-testid="custom-info">Custom: {unit.label}</p>} />,
  );
  await user.click(screen.getAllByRole("button", { name: "A11" })[0]);
  expect(await screen.findByTestId("custom-info")).toHaveTextContent("Custom: A11");
  // Default UnitInfo h2 should not be there.
  expect(screen.queryByRole("heading", { level: 2, name: "A11" })).not.toBeInTheDocument();
});

test("unitTone applies data-tone to map rectangles", () => {
  const { container } = render(<SiteMap unitTone={new Map([["A11", "done"]])} />);
  const rect = container.querySelector('rect[data-tone="done"]');
  expect(rect).not.toBeNull();
});

test("opens the tablet list on demand and keeps selection in a compact side panel", async () => {
  const original = window.matchMedia;
  const media = vi.spyOn(window, "matchMedia").mockImplementation((query) => {
    const result = original(query);
    Object.defineProperty(result, "matches", { value: query === "(min-width: 768px)" });
    return result;
  });
  try {
    const user = userEvent.setup();
    render(<SiteMap />);
    const list = screen.getByRole("complementary", { name: "Leilighetsliste" });
    expect(list).toHaveClass("hidden", "xl:flex", "w-72");
    expect(list).not.toHaveClass("md:flex");

    await user.click(screen.getByRole("button", { name: "Åpne liste" }));
    const dialog = await screen.findByRole("dialog", { name: "Leiligheter" });
    await user.click(within(dialog).getByRole("button", { name: "B31" }));
    const details = screen.getByRole("complementary", { name: "Leilighetsdetaljer" });
    expect(details).toHaveClass("w-80");
    expect(within(details).getByRole("heading", { name: "B31" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Etasjeplan 3. etasje" })).toBeInTheDocument();
    await user.click(within(details).getByRole("button", { name: "Neste leilighet" }));
    expect(within(details).getByRole("heading", { name: "B32" })).toBeInTheDocument();
    await user.click(within(details).getByRole("button", { name: "Lukk" }));
    expect(
      screen.queryByRole("complementary", { name: "Leilighetsdetaljer" }),
    ).not.toBeInTheDocument();
  } finally {
    media.mockRestore();
  }
});

test("prev/next buttons navigate between units in the info panel", async () => {
  const user = userEvent.setup();
  render(<SiteMap renderUnitInfo={(unit) => <p data-testid="panel-label">{unit.label}</p>} />);
  await user.click(screen.getAllByRole("button", { name: "A11" })[0]);
  expect(await screen.findByTestId("panel-label")).toHaveTextContent("A11");

  for (const name of ["Forrige leilighet", "Neste leilighet"]) {
    const button = screen.getByRole("button", { name });
    expect(button).toHaveClass("size-10", "border-border", "bg-background", "shadow-sm");
    expect(button).toHaveAttribute("title", name);
  }

  await user.click(screen.getByRole("button", { name: "Neste leilighet" }));
  expect(screen.getByTestId("panel-label")).toHaveTextContent("A12");

  await user.click(screen.getByRole("button", { name: "Forrige leilighet" }));
  expect(screen.getByTestId("panel-label")).toHaveTextContent("A11");

  await user.click(screen.getByRole("button", { name: "Forrige leilighet" }));
  // Wraps around to last unit.
  const lastLabel = screen.getByTestId("panel-label").textContent ?? "";
  expect(lastLabel.startsWith("C")).toBe(true);
});
