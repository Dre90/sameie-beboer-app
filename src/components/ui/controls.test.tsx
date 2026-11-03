import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "./badge";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Toggle } from "./toggle";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

// --control-border (src/style.css) gives control edges at least 3:1 contrast in both themes.
function expectControlBorder(element: HTMLElement) {
  expect(element).toHaveClass("border", "border-control-border");
  for (const weak of ["border-transparent", "border-border", "border-input"]) {
    expect(element).not.toHaveClass(weak);
  }
}

test("outline buttons and outline or secondary chips get a visible edge", () => {
  render(
    <>
      <Button variant="outline">Avbryt</Button>
      <Badge variant="outline">Hjemme</Badge>
      <Badge variant="secondary">Ikke utført</Badge>
      <Badge>Utført</Badge>
    </>,
  );
  expectControlBorder(screen.getByRole("button", { name: "Avbryt" }));
  expectControlBorder(screen.getByText("Hjemme"));
  expectControlBorder(screen.getByText("Ikke utført"));
  expect(screen.getByText("Utført")).toHaveClass("border-transparent", "bg-primary");
});

test("text fields get a visible edge that focus and errors still override", () => {
  render(
    <>
      <Input aria-label="Passord" />
      <Textarea aria-label="Kommentar" aria-invalid />
    </>,
  );
  for (const name of ["Passord", "Kommentar"]) {
    const field = screen.getByRole("textbox", { name });
    expectControlBorder(field);
    expect(field).toHaveClass("focus-visible:border-ring", "aria-invalid:border-destructive");
  }
});

// The dark primary fill is under 3:1 against the dark page, so a light edge marks the selection.
const pressedClasses = [
  "aria-pressed:border-primary",
  "aria-pressed:bg-primary",
  "aria-pressed:text-primary-foreground",
  "aria-pressed:hover:bg-primary",
  "aria-pressed:hover:text-primary-foreground",
  "dark:aria-pressed:border-primary-foreground",
];

test("a selected chip is filled with the primary color, also on hover", async () => {
  render(
    <ToggleGroup variant="outline" aria-label="Beboersvar" defaultValue={["home"]}>
      <ToggleGroupItem value="home">Hjemme</ToggleGroupItem>
      <ToggleGroupItem value="consent">Samtykke</ToggleGroupItem>
    </ToggleGroup>,
  );
  const home = screen.getByRole("button", { name: "Hjemme" });
  const consent = screen.getByRole("button", { name: "Samtykke" });
  for (const item of [home, consent]) {
    expectControlBorder(item);
    expect(item).toHaveClass(...pressedClasses);
    expect(item).not.toHaveClass("aria-pressed:bg-muted");
    expect(item).not.toHaveClass("data-[state=on]:bg-muted");
  }
  expect(home).toHaveAttribute("aria-pressed", "true");
  expect(consent).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(consent);
  expect(consent).toHaveAttribute("aria-pressed", "true");
  expect(home).toHaveAttribute("aria-pressed", "false");
});

test("a standalone toggle uses the same selected style", () => {
  render(
    <Toggle variant="outline" defaultPressed>
      Vis alle
    </Toggle>,
  );
  const toggle = screen.getByRole("button", { name: "Vis alle" });
  expectControlBorder(toggle);
  expect(toggle).toHaveClass(...pressedClasses);
  expect(toggle).toHaveAttribute("aria-pressed", "true");
});
