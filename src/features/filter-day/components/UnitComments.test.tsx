import { beforeEach, expect, test, vi } from "vite-plus/test";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { UnitCommentEditor, UnitCommentNotice, ownCommentField } from "./UnitComments";
import { filterApi } from "@/lib/filter-api";
import type { UnitStatus } from "@/lib/filter-types";

vi.mock("@/lib/filter-api", () => ({ filterApi: { setComment: vi.fn() } }));

const unit: UnitStatus = {
  id: "B24",
  response: "unanswered",
  completion: "pending",
  board_comment: "Hund i bur\nRing på først",
  craftsman_comment: "Ingen åpnet",
  version: 4,
  updated_at: "2026-10-01T12:00:00Z",
};
const empty = { ...unit, board_comment: "", craftsman_comment: "" };

function runOperation() {
  return vi.fn(async (operation: () => Promise<{ unit: UnitStatus }>) => {
    await operation();
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(filterApi.setComment).mockResolvedValue({ unit });
});

test("each role edits its own comment field", () => {
  expect(ownCommentField(true)).toBe("board_comment");
  expect(ownCommentField(false)).toBe("craftsman_comment");
});

test("craftsman reads the board's comment with line breaks and cannot change it", () => {
  render(<UnitCommentNotice unit={unit} isBoard={false} disabled={false} onSave={vi.fn()} />);
  const note = screen.getByRole("note", { name: "Kommentar fra styret" });
  const text = within(note).getByText(/Hund i bur/);
  expect(text.textContent).toBe("Hund i bur\nRing på først");
  expect(text).toHaveClass("whitespace-pre-wrap", "text-foreground");
  expect(within(note).queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText("Ingen åpnet")).not.toBeInTheDocument();
});

test("notice is not shown when the other role has written nothing", () => {
  const { container } = render(
    <UnitCommentNotice unit={empty} isBoard disabled={false} onSave={vi.fn()} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("board clears the craftsman's message only after confirming", async () => {
  const user = userEvent.setup();
  const onSave = runOperation();
  render(<UnitCommentNotice unit={unit} isBoard disabled={false} onSave={onSave} />);
  const note = screen.getByRole("note", { name: "Beskjed fra håndverker" });
  expect(note).toHaveTextContent("Ingen åpnet");
  await user.click(within(note).getByRole("button", { name: "Tøm beskjed" }));
  await user.click(screen.getByRole("button", { name: "Avbryt" }));
  expect(onSave).not.toHaveBeenCalled();
  await user.click(within(note).getByRole("button", { name: "Tøm beskjed" }));
  const dialog = screen.getByRole("alertdialog", { name: "Tømme beskjeden for B24?" });
  expect(dialog).toHaveTextContent("Styrets kommentar beholdes.");
  await user.click(within(dialog).getByRole("button", { name: "Tøm beskjed" }));
  expect(filterApi.setComment).toHaveBeenCalledWith(unit, "craftsman_comment", "");
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});

test("clearing is unavailable while saving or after a conflict", () => {
  render(<UnitCommentNotice unit={unit} isBoard disabled onSave={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Tøm beskjed" })).toBeDisabled();
});

test("board writes a comment and saves the trimmed text", async () => {
  const user = userEvent.setup();
  render(<UnitCommentEditor unit={empty} isBoard disabled={false} onSave={runOperation()} />);
  const textbox = screen.getByRole("textbox", { name: "Kommentar fra styret" });
  const save = screen.getByRole("button", { name: "Lagre kommentar" });
  expect(textbox).toHaveAccessibleDescription(
    "Skriv kun praktisk info, f.eks. «Hund i bur». Ikke navn, telefonnummer eller helseopplysninger. 0/500 tegn",
  );
  expect(save).toBeDisabled();
  await user.type(textbox, "  Hund i bur{Enter}Rolig  ");
  expect(screen.getByText("16/500 tegn")).toBeInTheDocument();
  await user.click(save);
  expect(filterApi.setComment).toHaveBeenCalledWith(empty, "board_comment", "Hund i bur\nRolig");
});

test("craftsman edits the message to the board and may clear it", async () => {
  const user = userEvent.setup();
  render(
    <UnitCommentEditor unit={unit} isBoard={false} disabled={false} onSave={runOperation()} />,
  );
  const textbox = screen.getByRole("textbox", { name: "Beskjed til styret" });
  const save = screen.getByRole("button", { name: "Lagre beskjed" });
  expect(textbox).toHaveValue("Ingen åpnet");
  expect(screen.queryByRole("textbox", { name: "Kommentar fra styret" })).not.toBeInTheDocument();
  await user.type(textbox, "   ");
  expect(save).toBeDisabled();
  await user.clear(textbox);
  expect(save).toBeEnabled();
  await user.click(save);
  expect(filterApi.setComment).toHaveBeenCalledWith(unit, "craftsman_comment", "");
});

test("too long or unsupported text is explained and cannot be saved", async () => {
  const user = userEvent.setup();
  render(<UnitCommentEditor unit={empty} isBoard disabled={false} onSave={runOperation()} />);
  const textbox = screen.getByRole("textbox", { name: "Kommentar fra styret" });
  const save = screen.getByRole("button", { name: "Lagre kommentar" });
  await user.click(textbox);
  await user.paste("a".repeat(501));
  expect(textbox).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByText("501/500 tegn")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Teksten er for lang. Maks 500 tegn.");
  expect(textbox).toHaveAccessibleDescription(/Teksten er for lang\. Maks 500 tegn\.$/);
  expect(save).toBeDisabled();
  await user.clear(textbox);
  await user.paste("🐕".repeat(500));
  expect(screen.getByText("500/500 tegn")).toBeInTheDocument();
  expect(textbox).not.toHaveAttribute("aria-invalid");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(save).toBeEnabled();
  await user.clear(textbox);
  await user.paste("Hund\u202Ei bur");
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Teksten inneholder tegn som ikke kan lagres.",
  );
  expect(save).toBeDisabled();
  expect(filterApi.setComment).not.toHaveBeenCalled();
});

test("typing stays possible while saving is blocked", async () => {
  const user = userEvent.setup();
  render(<UnitCommentEditor unit={empty} isBoard disabled onSave={runOperation()} />);
  const textbox = screen.getByRole("textbox", { name: "Kommentar fra styret" });
  await user.type(textbox, "Hund");
  expect(textbox).toBeEnabled();
  expect(textbox).toHaveValue("Hund");
  expect(screen.getByRole("button", { name: "Lagre kommentar" })).toBeDisabled();
});

test("comment notice and editor have no automated accessibility violations", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <main>
      <UnitCommentNotice unit={unit} isBoard disabled={false} onSave={vi.fn()} />
      <UnitCommentEditor unit={unit} isBoard disabled={false} onSave={vi.fn()} />
    </main>,
  );
  const options = { rules: { "color-contrast": { enabled: false } } };
  expect((await axe.run(container, options)).violations).toEqual([]);
  await user.click(screen.getByRole("textbox", { name: "Kommentar fra styret" }));
  await user.paste("a".repeat(501));
  expect((await axe.run(container, options)).violations).toEqual([]);
});
