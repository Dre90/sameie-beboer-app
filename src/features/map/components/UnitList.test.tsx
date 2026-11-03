import { expect, test } from "vite-plus/test";
import { render, screen, within } from "@testing-library/react";
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
  expect(screen.getByRole("button", { name: "B21" })).toHaveClass("border-dashed");
  expect(screen.getByRole("button", { name: "B21" })).not.toHaveClass("opacity-50");
  expect(screen.getByRole("button", { name: "B21" })).toHaveAttribute("title", "B21, 2. etasje");
  expect(screen.getByRole("button", { name: "A11" })).not.toHaveClass("opacity-50");
  expect(screen.getByRole("heading", { name: "Bygg A", level: 2 })).toBeInTheDocument();
});

test("announces large apartments to screen readers without visible text", () => {
  render(<UnitList selectedId={null} onSelect={noop} currentFloor={1} />);
  const large = screen.getByRole("button", { name: "B16, stor leilighet" });
  expect(large).toHaveTextContent(/^B16, stor leilighet$/);
  expect(within(large).getByText(", stor leilighet")).toHaveClass("sr-only");
  expect(large).toHaveAttribute("title", "B16, 1. etasje");
  expect(screen.getByRole("button", { name: "B31, stor leilighet" })).toHaveClass("border-dashed");
  expect(screen.getByRole("button", { name: "B15" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "C1" })).toBeInTheDocument();
});

test("marks units with a comment by icon and screen reader text", () => {
  render(
    <UnitList
      selectedId={null}
      onSelect={noop}
      currentFloor={1}
      commentedUnitIds={new Set(["A11", "B16"])}
    />,
  );
  const commented = screen.getByRole("button", { name: "A11, har kommentar" });
  expect(within(commented).getByText(", har kommentar")).toHaveClass("sr-only");
  expect(commented.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(commented.querySelector("svg")).toHaveAttribute("data-icon", "inline-end");
  expect(
    screen.getByRole("button", { name: "B16, stor leilighet, har kommentar" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "A12" }).querySelector("svg")).toBeNull();
});

test("marks the selected unit as pressed", () => {
  render(<UnitList selectedId="A11" onSelect={noop} currentFloor={1} />);
  expect(screen.getByRole("button", { name: "A11", pressed: true })).toBeInTheDocument();
});
