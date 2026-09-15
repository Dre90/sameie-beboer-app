// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, test } from "vite-plus/test";
import { verifyPassword } from "../server/password";

test("local setup generates private credentials and refuses overwrites", async () => {
  const directory = mkdtempSync(join(tmpdir(), "filter-setup-"));
  const script = resolve("scripts/setup-local.ts");
  try {
    const env = { ...process.env, CI: "", NETLIFY: "" };
    execFileSync(process.execPath, [script], {
      cwd: directory,
      env,
      stdio: "pipe",
    });
    const passwords = JSON.parse(
      readFileSync(join(directory, ".secrets/local-passwords.json"), "utf8"),
    );
    const config = readFileSync(join(directory, ".env"), "utf8");
    const hash = /BOARD_PASSWORD_HASH='([^']+)'/.exec(config)![1];
    expect(await verifyPassword(passwords.board, hash)).toBe(true);
    expect(passwords.board).not.toBe(passwords.craftsman);
    expect(config).not.toContain(passwords.board);
    expect(statSync(join(directory, ".env")).mode & 0o777).toBe(0o600);
    expect(() =>
      execFileSync(process.execPath, [script], {
        cwd: directory,
        env,
        stdio: "pipe",
      }),
    ).toThrow();
    expect(() =>
      execFileSync(process.execPath, [script], {
        cwd: directory,
        env: { ...env, CI: "true" },
        stdio: "pipe",
      }),
    ).toThrow();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
