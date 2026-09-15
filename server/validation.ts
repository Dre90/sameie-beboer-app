import { unitsById } from "../src/features/map/data/units";
import { completionKinds, responseKinds } from "../src/lib/filter-types";

export function validateUpdate(id: string, field: "response" | "completion", body: unknown) {
  if (!unitsById.has(id)) throw new Error("Ukjent leilighet");
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Ugyldig forespørsel");
  }
  const input = body as Record<string, unknown>;
  const allowed: readonly unknown[] = field === "response" ? responseKinds : completionKinds;
  if (
    Object.keys(input).length !== 2 ||
    !allowed.includes(input[field]) ||
    !Number.isSafeInteger(input.version) ||
    (input.version as number) < 0
  ) {
    throw new Error("Ugyldig status eller versjon");
  }
  return { value: input[field] as string, version: input.version as number };
}
