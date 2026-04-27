import { expect, test, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiteMap } from "./SiteMap";

vi.mock("@/lib/api-client", () => ({
  api: {
    units: {
      get: vi.fn().mockResolvedValue({
        unit: {
          id: "X",
          is_rented: false,
          owner_name: null,
          owner_email: null,
          owner_phone: null,
          updated_at: "",
          residents: [],
        },
        residents: [],
      }),
    },
  },
}));

test("renders floor tabs and unit list", () => {
  render(<SiteMap />);
  expect(screen.getAllByRole("tab", { name: "1. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("tab", { name: "2. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("tab", { name: "3. etg" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "A11" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "B36" }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("button", { name: "C1" }).length).toBeGreaterThan(0);
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
});

test("selecting a townhouse shows the rekkehus label", async () => {
  const user = userEvent.setup();
  render(<SiteMap />);
  await user.click(screen.getAllByRole("button", { name: "C3" })[0]);
  expect(screen.getByText("Rekkehus C (alle etasjer)")).toBeInTheDocument();
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

test("prev/next buttons navigate between units in the info panel", async () => {
  const user = userEvent.setup();
  render(<SiteMap renderUnitInfo={(unit) => <p data-testid="panel-label">{unit.label}</p>} />);
  await user.click(screen.getAllByRole("button", { name: "A11" })[0]);
  expect(await screen.findByTestId("panel-label")).toHaveTextContent("A11");

  await user.click(screen.getByRole("button", { name: "Neste leilighet" }));
  expect(screen.getByTestId("panel-label")).toHaveTextContent("A12");

  await user.click(screen.getByRole("button", { name: "Forrige leilighet" }));
  expect(screen.getByTestId("panel-label")).toHaveTextContent("A11");

  await user.click(screen.getByRole("button", { name: "Forrige leilighet" }));
  // Wraps around to last unit.
  const lastLabel = screen.getByTestId("panel-label").textContent ?? "";
  expect(lastLabel.startsWith("C")).toBe(true);
});
