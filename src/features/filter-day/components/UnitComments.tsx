import { useState } from "react";
import { MessageSquareTextIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { filterApi } from "@/lib/filter-api";
import {
  COMMENT_MAX_LENGTH,
  commentError,
  commentLabels,
  commentLength,
  normalizeComment,
  type CommentField,
  type UnitStatus,
} from "@/lib/filter-types";

type CommentProps = {
  unit: UnitStatus;
  isBoard: boolean;
  disabled: boolean;
  onSave: (operation: () => Promise<{ unit: UnitStatus }>) => Promise<void>;
};

export const ownCommentField = (isBoard: boolean): CommentField =>
  isBoard ? "board_comment" : "craftsman_comment";

const editorLabels: Record<CommentField, string> = {
  board_comment: "Kommentar fra styret",
  craftsman_comment: "Beskjed til styret",
};

/** The other role's comment, read-only. The board may clear the craftsman's message. */
export function UnitCommentNotice({ unit, isBoard, disabled, onSave }: CommentProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const field: CommentField = isBoard ? "craftsman_comment" : "board_comment";
  const text = unit[field];
  if (!text) return null;
  const titleId = `${field}-notice-${unit.id}`;
  return (
    <Alert role="note" aria-labelledby={titleId}>
      <MessageSquareTextIcon />
      <AlertTitle id={titleId}>{commentLabels[field]}</AlertTitle>
      <AlertDescription className="text-base wrap-break-word whitespace-pre-wrap text-pretty text-foreground">
        {text}
      </AlertDescription>
      {isBoard && (
        <div className="col-start-2 mt-2">
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger disabled={disabled} render={<Button variant="outline" />}>
              <Trash2Icon data-icon="inline-start" />
              Tøm beskjed
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tømme beskjeden for {unit.id}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Beskjeden fra håndverkeren slettes. Styrets kommentar beholdes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction
                  disabled={disabled}
                  onClick={() => {
                    setConfirmOpen(false);
                    void onSave(() => filterApi.setComment(unit, "craftsman_comment", ""));
                  }}
                >
                  Tøm beskjed
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Alert>
  );
}

/** Edits the signed-in role's own comment. Saving an empty text clears it. */
export function UnitCommentEditor({ unit, isBoard, disabled, onSave }: CommentProps) {
  const field = ownCommentField(isBoard);
  const saved = unit[field];
  const [draft, setDraft] = useState(saved);
  const text = normalizeComment(draft);
  const error = commentError(text);
  const id = `${field}-${unit.id}`;
  const describedBy = [`${id}-hint`, `${id}-count`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ");
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(() => filterApi.setComment(unit, field, text));
      }}
    >
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={id}>{editorLabels[field]}</FieldLabel>
          <Textarea
            id={id}
            rows={3}
            value={draft}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex items-start justify-between gap-3">
            <FieldDescription id={`${id}-hint`}>
              Skriv kun praktisk info, f.eks. «Hund i bur». Ikke navn, telefonnummer eller
              helseopplysninger.
            </FieldDescription>
            <span
              id={`${id}-count`}
              className="shrink-0 text-sm text-muted-foreground tabular-nums"
            >
              {commentLength(text)}/{COMMENT_MAX_LENGTH} tegn
            </span>
          </div>
          {error && <FieldError id={`${id}-error`}>{error}</FieldError>}
        </Field>
        <Button
          type="submit"
          variant="outline"
          disabled={disabled || error !== null || text === saved}
        >
          <SaveIcon data-icon="inline-start" />
          {isBoard ? "Lagre kommentar" : "Lagre beskjed"}
        </Button>
      </FieldGroup>
    </form>
  );
}
