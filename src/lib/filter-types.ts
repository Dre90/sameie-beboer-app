export const responseKinds = ["unanswered", "home", "consent", "self_service"] as const;
export const completionKinds = ["pending", "performed", "delivered"] as const;
export type ResponseKind = (typeof responseKinds)[number];
export type CompletionKind = (typeof completionKinds)[number];
export type Role = "board" | "craftsman";

export type UnitStatus = {
  id: string;
  response: ResponseKind;
  completion: CompletionKind;
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
