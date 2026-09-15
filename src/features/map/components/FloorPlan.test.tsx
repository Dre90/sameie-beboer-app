import { expect, test, vi } from "vite-plus/test";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { FloorPlan } from "./FloorPlan";
import { floor1Geometry } from "../data/geometry";
import type { UnitTone } from "../lib/tone";

test.each(["unanswered", "home", "consent", "self_service", "done"] as UnitTone[])(
  "selected %s unit keeps its status fill with a contrasting border",
  (tone) => {
    const { container } = render(
      <FloorPlan
        geometry={floor1Geometry}
        floor={1}
        selectedId="A11"
        onSelect={vi.fn()}
        unitTone={new Map([["A11", tone]])}
      />,
    );
    const selected = container.querySelector('rect[data-selected="true"]');
    expect(selected).toHaveClass("stroke-foreground");
    expect(selected).not.toHaveClass(
      "fill-primary",
      "data-[tone=unanswered]:stroke-map-unanswered",
    );
    expect(selected).toHaveAttribute("data-tone", tone);
    expect(selected).toHaveClass(
      tone === "unanswered"
        ? "data-[tone=unanswered]:fill-[url(#map-unanswered-stripes)]"
        : tone === "self_service"
          ? "fill-map-self-service"
          : `data-[tone=${tone}]:fill-map-${tone}`,
    );
    expect(selected).toHaveAttribute("stroke-width", "4");
    expect(selected).toHaveAttribute("vector-effect", "non-scaling-stroke");
    expect(screen.getByText("A11")).toHaveAttribute("data-selected", "true");
    expect(screen.getByText("A11")).toHaveClass("fill-foreground", "stroke-background");
    expect(container.querySelector('rect[data-selected="false"]')).toHaveClass("fill-secondary");
  },
);

test("response and completion colors update without clearing the selection", () => {
  const onSelect = vi.fn();
  const { rerender } = render(
    <FloorPlan
      geometry={floor1Geometry}
      floor={1}
      selectedId="A11"
      onSelect={onSelect}
      unitTone={new Map([["A11", "unanswered"]])}
    />,
  );
  for (const [tone, label] of [
    ["home", "Hjemme"],
    ["done", "Fullført eller levert"],
  ] as const) {
    rerender(
      <FloorPlan
        geometry={floor1Geometry}
        floor={1}
        selectedId="A11"
        onSelect={onSelect}
        unitTone={new Map([["A11", tone]])}
      />,
    );
    const selected = screen.getByRole("button", { name: `Leilighet A11, ${label}`, pressed: true });
    expect(selected).toHaveAttribute("data-tone", tone);
    expect(selected).toHaveClass(`data-[tone=${tone}]:fill-map-${tone}`, "stroke-foreground");
    expect(selected).not.toHaveClass("fill-primary");
  }
  expect(onSelect).not.toHaveBeenCalled();
});

test("map buttons expose status and support mouse, Enter and Space", async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(
    <FloorPlan
      geometry={floor1Geometry}
      floor={1}
      selectedId="A11"
      onSelect={onSelect}
      unitTone={new Map([["A11", "unanswered"]])}
    />,
  );
  const button = screen.getByRole("button", { name: "Leilighet A11, Mangler svar", pressed: true });
  button.focus();
  expect(button).toHaveFocus();
  await user.keyboard("{Enter} ");
  await user.click(button);
  expect(onSelect).toHaveBeenCalledTimes(3);
  expect(onSelect).toHaveBeenLastCalledWith("A11");
  await user.keyboard("{ArrowRight}");
  fireEvent.keyDown(button, { key: "Enter", repeat: true });
  expect(onSelect).toHaveBeenCalledTimes(3);
  expect(screen.getByRole("group", { name: "Etasjeplan 1. etasje" })).toContainElement(button);
  expect(screen.getByText("A12")).toHaveClass("stroke-background", "fill-foreground");
  expect(screen.getByText("A12")).toHaveAttribute("paint-order", "stroke");
});

test("map has no automated accessibility violations", async () => {
  const { container } = render(
    <main>
      <FloorPlan geometry={floor1Geometry} floor={1} selectedId={null} onSelect={vi.fn()} />
    </main>,
  );
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  expect(results.violations).toEqual([]);
});
