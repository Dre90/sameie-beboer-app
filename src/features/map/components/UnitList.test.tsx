import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UnitList } from "./UnitList";

function noop() {}

test("shows empty state when no units match search", async () => {
  const user = userEvent.setup();
  render(<UnitList selectedId={null} onSelect={noop} currentFloor={1} />);
  await user.type(screen.getByRole("searchbox"), "ZZZ999");
  expect(screen.getByText("Ingen treff")).toBeInTheDocument();
});

test("distinguishes other floors without reducing text contrast", () => {
  render(<UnitList selectedId={null} onSelect={noop} currentFloor={1} />);
  expect(screen.getByRole("button", { name: "B31" })).toHaveClass("border-dashed");
  expect(screen.getByRole("button", { name: "B31" })).not.toHaveClass("opacity-50");
  expect(screen.getByRole("button", { name: "B31" })).toHaveAttribute("title", "B31, 3. etasje");
  expect(screen.getByRole("button", { name: "A11" })).not.toHaveClass("opacity-50");
  expect(screen.getByRole("heading", { name: "Bygg A", level: 2 })).toBeInTheDocument();
});

test("marks the selected unit as pressed", () => {
  render(<UnitList selectedId="A11" onSelect={noop} currentFloor={1} />);
  expect(screen.getByRole("button", { name: "A11", pressed: true })).toBeInTheDocument();
});
