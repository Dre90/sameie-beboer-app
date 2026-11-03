import { expect, test } from "vite-plus/test";
import { validateUpdate } from "./validation";

test("accepts independent response and completion changes", () => {
  expect(validateUpdate("B24", "response", { response: "consent", version: 0 })).toEqual({
    value: "consent",
    version: 0,
  });
  expect(validateUpdate("C7", "completion", { completion: "delivered", version: 3 })).toEqual({
    value: "delivered",
    version: 3,
  });
});

test("rejects unknown units, statuses, versions and extra fields", () => {
  expect(() => validateUpdate("B99", "response", { response: "home", version: 0 })).toThrow();
  for (const body of [
    null,
    [],
    {},
    { response: "other", version: 0 },
    { response: "home", version: -1 },
    { response: "home", version: 1.5 },
    { response: "home", version: "0" },
    { response: "home", version: 0, completion: "performed" },
  ]) {
    expect(() => validateUpdate("B24", "response", body)).toThrow();
  }
  expect(() => validateUpdate("B24", "completion", { completion: "home", version: 0 })).toThrow();
});

test("normalizes comments for both comment fields", () => {
  expect(
    validateUpdate("B24", "board_comment", { board_comment: "  Hund i bur\r\n", version: 2 }),
  ).toEqual({ value: "Hund i bur", version: 2 });
  expect(
    validateUpdate("C1", "craftsman_comment", {
      craftsman_comment: "Ring\tpå\r\nigjen",
      version: 0,
    }),
  ).toEqual({ value: "Ring på\nigjen", version: 0 });
  expect(
    validateUpdate("A11", "craftsman_comment", { craftsman_comment: " ", version: 0 }),
  ).toEqual({ value: "", version: 0 });
  expect(
    validateUpdate("B24", "board_comment", { board_comment: "🐕".repeat(500), version: 0 }).value,
  ).toBe("🐕".repeat(500));
});

test("rejects comments that are not plain text within the limit", () => {
  expect(() =>
    validateUpdate("B99", "board_comment", { board_comment: "x", version: 0 }),
  ).toThrow();
  for (const body of [
    { board_comment: 1, version: 0 },
    { board_comment: null, version: 0 },
    { board_comment: ["x"], version: 0 },
    { board_comment: "a".repeat(501), version: 0 },
    { board_comment: "🐕".repeat(501), version: 0 },
    { board_comment: "a\u0000b", version: 0 },
    { board_comment: "\u202Eabc", version: 0 },
    { board_comment: "x", version: 0, craftsman_comment: "y" },
    { craftsman_comment: "x", version: 0 },
    { board_comment: "x" },
    { board_comment: "x", version: -1 },
  ]) {
    expect(() => validateUpdate("B24", "board_comment", body), JSON.stringify(body)).toThrow();
  }
});
