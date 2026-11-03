import { expect, test } from "vite-plus/test";
import { render, screen } from "@testing-library/react";
import { ResponseInstruction } from "./ResponseInstruction";
import { responseKinds, type ResponseKind, type UnitStatus } from "@/lib/filter-types";

const unit = (response: ResponseKind): UnitStatus => ({
  id: "B24",
  response,
  completion: "pending",
  board_comment: "",
  craftsman_comment: "",
  version: 0,
  updated_at: "2026-09-15T12:00:00Z",
});

test.each([
  ["home", "Hjemme", "Ring på", "bg-map-home/15", "border-l-map-home"],
  ["consent", "Samtykke", "Du kan låse deg inn", "bg-map-consent/15", "border-l-map-consent"],
  [
    "self_service",
    "Gjør selv",
    "Sett filteret utenfor døra",
    "bg-map-self-service/20",
    "border-l-map-self-service",
  ],
  [
    "unanswered",
    "Mangler svar",
    "Ring på. Ikke lås deg inn.",
    "bg-map-unanswered/10",
    "border-l-map-unanswered",
  ],
] as const)(
  "%s shows the label, what to do and the map color",
  (kind, label, action, bg, stripe) => {
    render(<ResponseInstruction unit={unit(kind)} />);
    const group = screen.getByRole("group", { name: "Beboersvar" });
    expect(group).toHaveClass(bg, stripe, "border-l-8", "text-foreground");
    expect(screen.getByText(label)).toHaveClass("text-2xl", "font-semibold");
    expect(screen.getByText(action)).toHaveClass("text-lg", "font-medium");
    expect(group.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  },
);

test("only a missing response tells the craftsman to leave a message", () => {
  for (const kind of responseKinds) {
    const { unmount } = render(<ResponseInstruction unit={unit(kind)} />);
    const hint = screen.queryByText("Skriv en beskjed til styret hvis ingen åpner.");
    if (kind === "unanswered") expect(hint).toBeInTheDocument();
    else expect(hint).not.toBeInTheDocument();
    unmount();
  }
});

test("reads as one labelled group in order: label, status, action", () => {
  render(<ResponseInstruction unit={unit("consent")} />);
  expect(screen.getByTestId("response-instruction-B24")).toHaveTextContent(
    "BeboersvarSamtykkeDu kan låse deg inn",
  );
});
