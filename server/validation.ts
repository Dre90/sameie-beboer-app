import { unitsById } from "../src/features/map/data/units";
import {
  commentError,
  completionKinds,
  isCommentField,
  normalizeComment,
  responseKinds,
  type UnitField,
} from "../src/lib/filter-types";

export function validateUpdate(id: string, field: UnitField, body: unknown) {
  if (!unitsById.has(id)) throw new Error("Ukjent leilighet");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Ugyldig forespørsel");
  }
  const input = body as Record<string, unknown>;
  if (
    Object.keys(input).length !== 2 ||
    !Number.isSafeInteger(input.version) ||
    (input.version as number) < 0
  ) {
    throw new Error("Ugyldig status eller versjon");
  }
  const version = input.version as number;
  const raw = input[field];
  if (isCommentField(field)) {
    if (typeof raw !== "string") throw new Error("Ugyldig kommentar");
    const value = normalizeComment(raw);
    if (commentError(value)) throw new Error("Ugyldig kommentar");
    return { value, version };
  }
  const allowed: readonly unknown[] = field === "response" ? responseKinds : completionKinds;
  if (!allowed.includes(raw)) throw new Error("Ugyldig status eller versjon");
  return { value: raw as string, version };
}
