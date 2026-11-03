import { expect, test } from "vite-plus/test";
import {
  COMMENT_MAX_LENGTH,
  commentError,
  commentLength,
  isCommentField,
  normalizeComment,
} from "./filter-types";

test("normalizes line breaks and tabs and trims surrounding whitespace", () => {
  expect(normalizeComment("  Hund i bur \r\n  ok\t\n ")).toBe("Hund i bur \n  ok");
  expect(normalizeComment("a\rb")).toBe("a\nb");
  expect(normalizeComment(" \n\t ")).toBe("");
});

test("counts characters as code points, like Postgres char_length", () => {
  expect(commentLength("🐕🐕")).toBe(2);
  expect(commentLength("Hund i bur")).toBe(10);
  expect(commentLength("")).toBe(0);
});

test("accepts ordinary text, line breaks and emoji up to the limit", () => {
  for (const text of [
    "",
    "Hund i bur",
    "linje 1\nlinje 2",
    "Kode til porten: «ring på»",
    "👨‍👩‍👧 hjemme",
    "a".repeat(COMMENT_MAX_LENGTH),
    "🐕".repeat(COMMENT_MAX_LENGTH),
  ]) {
    expect(commentError(text), text).toBeNull();
  }
});

test("rejects text that is too long", () => {
  for (const text of ["a".repeat(COMMENT_MAX_LENGTH + 1), "🐕".repeat(COMMENT_MAX_LENGTH + 1)]) {
    expect(commentError(text)).toBe("Teksten er for lang. Maks 500 tegn.");
  }
});

test("rejects control characters, lone surrogates and bidi overrides", () => {
  for (const text of [
    "a\u0000b",
    "a\u0007b",
    "a\u007Fb",
    "a\u0085b",
    "\u202Eabc",
    "a\u2066b",
    `a${String.fromCharCode(0xd800)}b`,
  ]) {
    expect(commentError(text), JSON.stringify(text)).toBe(
      "Teksten inneholder tegn som ikke kan lagres.",
    );
  }
});

test("recognizes only the two comment fields", () => {
  expect(isCommentField("board_comment")).toBe(true);
  expect(isCommentField("craftsman_comment")).toBe(true);
  for (const field of ["response", "completion", "comment", "__proto__", ""]) {
    expect(isCommentField(field)).toBe(false);
  }
});
