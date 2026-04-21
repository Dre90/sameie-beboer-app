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

test("dims units that are not on the current floor", () => {
  render(<UnitList selectedId={null} onSelect={noop} currentFloor={1} />);
  // B31 is on floor 3, so it should be dimmed when currentFloor=1
  expect(screen.getByRole("button", { name: "B31" })).toHaveClass("opacity-50");
  // A11 is on floor 1, so it should not be dimmed
  expect(screen.getByRole("button", { name: "A11" })).not.toHaveClass("opacity-50");
});

test("marks the selected unit as pressed", () => {
  render(<UnitList selectedId="A11" onSelect={noop} currentFloor={1} />);
  expect(screen.getByRole("button", { name: "A11", pressed: true })).toBeInTheDocument();
});
