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
