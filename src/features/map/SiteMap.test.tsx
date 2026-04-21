import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
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
