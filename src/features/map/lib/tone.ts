/**
 * Visual tones used to color-code units on the floor plan. Consumers (e.g.
 * the activity page) provide a per-unit tone; the default `/kart` view leaves
 * tones unset so the map keeps its neutral look.
 */
export type UnitTone = "neutral" | "done" | "home" | "consent" | "self_service" | "unanswered";

export type UnitToneMap = ReadonlyMap<string, UnitTone>;

export function getTone(map: UnitToneMap | undefined, id: string): UnitTone {
  return map?.get(id) ?? "neutral";
}
