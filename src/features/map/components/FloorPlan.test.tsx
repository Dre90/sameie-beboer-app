import { expect, test, vi } from "vite-plus/test";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { FloorPlan } from "./FloorPlan";
import { floor1Geometry, floor2Geometry } from "../data/geometry";
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

test("map buttons announce large apartments without changing the visible tooltip", () => {
  render(
    <FloorPlan
      geometry={floor1Geometry}
      floor={1}
      selectedId={null}
      onSelect={vi.fn()}
      unitTone={new Map([["B16", "home"]])}
    />,
  );
  const large = screen.getByRole("button", { name: "Leilighet B16, stor leilighet, Hjemme" });
  expect(large.querySelector("title")).toHaveTextContent(/^B16: Hjemme$/);
  expect(
    screen.getByRole("button", { name: "Leilighet B15, Status ikke tilgjengelig" }),
  ).toBeInTheDocument();
  expect(screen.getByText("B16")).toBeInTheDocument();
  expect(screen.queryByText(/stor/i)).not.toBeInTheDocument();
});

test("A21 on floor 2 is announced as a large apartment", () => {
  render(
    <FloorPlan
      geometry={floor2Geometry}
      floor={2}
      selectedId={null}
      onSelect={vi.fn()}
      unitTone={new Map([["A21", "consent"]])}
    />,
  );
  expect(
    screen.getByRole("button", { name: "Leilighet A21, stor leilighet, Samtykke" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Leilighet A22, Status ikke tilgjengelig" }),
  ).toBeInTheDocument();
});

test("units with a comment get a corner marker and announce it", () => {
  const { container } = render(
    <FloorPlan
      geometry={floor1Geometry}
      floor={1}
      selectedId={null}
      onSelect={vi.fn()}
      unitTone={new Map([["A11", "home"]])}
      commentedUnitIds={new Set(["A11", "B16"])}
    />,
  );
  const commented = screen.getByRole("button", { name: "Leilighet A11, Hjemme, har kommentar" });
  expect(commented.querySelector("title")).toHaveTextContent(/^A11: Hjemme, har kommentar$/);
  expect(
    screen.getByRole("button", {
      name: "Leilighet B16, stor leilighet, Status ikke tilgjengelig, har kommentar",
    }),
  ).toBeInTheDocument();
  const markers = container.querySelectorAll("circle[data-comment-marker]");
  expect([...markers].map((marker) => marker.getAttribute("data-comment-marker"))).toEqual([
    "A11",
    "B16",
  ]);
  const marker = container.querySelector('circle[data-comment-marker="A11"]')!;
  expect(marker).toHaveAttribute("aria-hidden", "true");
  expect(marker).toHaveClass("pointer-events-none", "fill-foreground", "stroke-background");
  expect(
    screen.getByRole("button", { name: "Leilighet A12, Status ikke tilgjengelig" }),
  ).toBeInTheDocument();
});

test("comment markers stay inside each tile and clear of the centered label", () => {
  const { container } = render(
    <FloorPlan
      geometry={floor1Geometry}
      floor={1}
      selectedId={null}
      onSelect={vi.fn()}
      commentedUnitIds={new Set(Object.keys(floor1Geometry))}
    />,
  );
  for (const [id, rect] of Object.entries(floor1Geometry)) {
    const marker = container.querySelector(`circle[data-comment-marker="${id}"]`)!;
    const [cx, cy, r] = ["cx", "cy", "r"].map((name) => Number(marker.getAttribute(name)));
    expect(cx + r, id).toBeLessThanOrEqual(rect.x + rect.w);
    expect(cy - r, id).toBeGreaterThanOrEqual(rect.y);
    expect(cy + r, id).toBeLessThanOrEqual(rect.y + rect.h);
    // Labels are at most three 18px characters wide, about 20 units on each side of the center.
    expect(cx - r - (rect.x + rect.w / 2), id).toBeGreaterThanOrEqual(20);
  }
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
