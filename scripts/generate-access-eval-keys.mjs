#!/usr/bin/env node
/**
 * Generate an ES256 (P-256) keypair for Cloudflare Access External Evaluation.
 *
 * Usage:
 *   node scripts/generate-access-eval-keys.mjs
 *
 * Writes two files (gitignored under .secrets/):
 *   - .secrets/access-eval-private.pem  → set as wrangler secret ACCESS_EVAL_PRIVATE_KEY
 *   - .secrets/access-eval-public.pem   → paste into Cloudflare Access policy
 *                                         "External Evaluation" rule (Public Key field)
 */
import { generateKeyPairSync } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const dir = resolve(".secrets");
mkdirSync(dir, { recursive: true });
const privPath = resolve(dir, "access-eval-private.pem");
const pubPath = resolve(dir, "access-eval-public.pem");
writeFileSync(privPath, privateKey, { mode: 0o600 });
writeFileSync(pubPath, publicKey);

process.stderr.write(`Wrote ${privPath}\n`);
process.stderr.write(`Wrote ${pubPath}\n`);
process.stderr.write(`\nNext steps:\n`);
process.stderr.write(`  pnpm dlx wrangler secret put ACCESS_EVAL_PRIVATE_KEY < ${privPath}\n`);
process.stderr.write(`  cat ${pubPath}    # copy into Access policy\n`);
