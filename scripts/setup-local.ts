import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hashPassword } from "../server/password.ts";

if (process.env.NETLIFY === "true" || process.env.CI) {
  throw new Error("Local setup must not run on a hosting platform or CI");
}
if (existsSync(".env") || existsSync(".secrets/local-passwords.json")) {
  throw new Error("Local configuration already exists; refusing to overwrite it");
}
const demo = process.argv.includes("--demo");
const passwords = {
  board: demo ? "local-board-only" : randomBytes(24).toString("base64url"),
  craftsman: demo ? "local-craftsman-only" : randomBytes(24).toString("base64url"),
};
const boardHash = await hashPassword(passwords.board);
const craftsmanHash = await hashPassword(passwords.craftsman);
const until = new Date(Date.now() + 7 * 86400000).toISOString();
mkdirSync(".secrets", { recursive: true, mode: 0o700 });
writeFileSync(".secrets/local-passwords.json", JSON.stringify(passwords, null, 2) + "\n", {
  mode: 0o600,
  flag: "wx",
});
writeFileSync(
  ".env",
  [
    "# Local development only. Never import this file into Netlify production.",
    `BOARD_PASSWORD_HASH='${boardHash}'`,
    `CRAFTSMAN_PASSWORD_HASH='${craftsmanHash}'`,
    `CRAFTSMAN_ACCESS_UNTIL=${until}`,
    "FILTER_EVENT_DATE=",
    "",
  ].join("\n"),
  { mode: 0o600, flag: "wx" },
);
console.log("Local configuration created. Passwords: .secrets/local-passwords.json");
if (demo)
  console.log("Demo credentials enabled for local tests only. Never publish these passwords.");
