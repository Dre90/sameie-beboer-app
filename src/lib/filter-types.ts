export const responseKinds = ["unanswered", "home", "consent", "self_service"] as const;
export const completionKinds = ["pending", "performed", "delivered"] as const;
export const commentFields = ["board_comment", "craftsman_comment"] as const;
export type ResponseKind = (typeof responseKinds)[number];
export type CompletionKind = (typeof completionKinds)[number];
export type CommentField = (typeof commentFields)[number];
export type UnitField = "response" | "completion" | CommentField;
export type Role = "board" | "craftsman";

export const COMMENT_MAX_LENGTH = 500;

export type UnitStatus = {
  id: string;
  response: ResponseKind;
  completion: CompletionKind;
  board_comment: string;
  craftsman_comment: string;
  version: number;
  updated_at: string;
};

export type Overview = {
  units: UnitStatus[];
  eventDate: string | null;
  fetchedAt: string;
};

export const responseLabels: Record<ResponseKind, string> = {
  unanswered: "Mangler svar",
  home: "Hjemme",
  consent: "Samtykke",
  self_service: "Gjør selv",
};

export const completionLabels: Record<CompletionKind, string> = {
  pending: "Ikke utført",
  performed: "Utført",
  delivered: "Levert på døra",
};

export const commentLabels: Record<CommentField, string> = {
  board_comment: "Kommentar fra styret",
  craftsman_comment: "Beskjed fra håndverker",
};

export const isCommentField = (field: string): field is CommentField =>
  (commentFields as readonly string[]).includes(field);

// Shared by client and server so the counter and the stored text always agree.
export function normalizeComment(text: string) {
  return text.replace(/\r\n?/g, "\n").replace(/\t/g, " ").trim();
}

// Counts code points like Postgres char_length, so an emoji counts as one character.
export function commentLength(text: string) {
  return Array.from(text).length;
}

// Control characters except line breaks, lone surrogates and bidi overrides.
const disallowedCommentCharacters = /(?!\n)[\p{Cc}\p{Cs}\u202A-\u202E\u2066-\u2069]/u;

export function commentError(normalized: string): string | null {
  if (commentLength(normalized) > COMMENT_MAX_LENGTH) {
    return `Teksten er for lang. Maks ${COMMENT_MAX_LENGTH} tegn.`;
  }
  if (disallowedCommentCharacters.test(normalized)) {
    return "Teksten inneholder tegn som ikke kan lagres.";
  }
  return null;
}
