import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { SignJWT, exportJWK, importPKCS8, jwtVerify, createRemoteJWKSet } from "jose";
import type { WorkerEnv } from "../types";

type Ctx = { Bindings: WorkerEnv };

/**
 * Cloudflare Access External Evaluation endpoint.
 *
 * Access POSTs `{ token: "<jwt>" }` to this URL during policy evaluation.
 * The JWT is signed by Access and contains the user's identity (email).
 *
 * We respond with `{ token: "<signed-jwt>" }` where the JWT body is
 * `{ success: true|false, iat, exp, nonce }` signed with our ES256 private
 * key. Cloudflare Access verifies the signature against the public key
 * configured in the policy.
 *
 * Returning `success: false` blocks the user before any OTP code is sent.
 */
export const accessEvalRoute = new Hono<Ctx>();

const evalJwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();
function getEvalJwks(teamDomain: string) {
  let jwks = evalJwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    evalJwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

type AccessEvalClaims = {
  email?: string;
  identity_nonce?: string;
  nonce?: string;
  identity?: { email?: string };
};

accessEvalRoute.post("/", async (c) => {
  const env = c.env;
  if (!env.ACCESS_TEAM_DOMAIN) {
    throw new HTTPException(500, { message: "ACCESS_TEAM_DOMAIN not configured" });
  }
  if (!env.ACCESS_EVAL_PRIVATE_KEY) {
    throw new HTTPException(500, { message: "ACCESS_EVAL_PRIVATE_KEY not configured" });
  }

  const body = (await c.req.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token;
  if (!token) throw new HTTPException(400, { message: "Missing token" });

  // Verify the incoming JWT signed by Access.
  // Note: Access does not always set `iss` on the External Evaluation token,
  // so we don't enforce it here — the JWKS already binds the token to our team domain.
  let email = "";
  let nonce = "";
  try {
    const jwks = getEvalJwks(env.ACCESS_TEAM_DOMAIN);
    const { payload } = await jwtVerify<AccessEvalClaims>(token, jwks);
    email = (payload.identity?.email ?? payload.email ?? "").toLowerCase();
    nonce = payload.identity_nonce ?? payload.nonce ?? "";
  } catch (err) {
    console.error("external-eval: JWT verification failed", err);
    throw new HTTPException(401, { message: "Invalid token" });
  }

  // Look up email in users table.
  let allowed = false;
  if (email) {
    const row = await env.DB.prepare("SELECT email FROM users WHERE email = ?")
      .bind(email)
      .first<{ email: string }>();
    allowed = row != null;
  }

  // Sign response.
  const privateKey = await importPKCS8(env.ACCESS_EVAL_PRIVATE_KEY, "ES256");
  const responseJwt = await new SignJWT({ success: allowed, nonce })
    .setProtectedHeader({ alg: "ES256", kid: env.ACCESS_EVAL_KEY_ID ?? "access-eval" })
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(privateKey);

  return c.json({ token: responseJwt });
});

/**
 * JWKS endpoint for Cloudflare Access to fetch our public key.
 * Configure this URL as the "Keys URL" on the External Evaluation rule.
 */
accessEvalRoute.get("/keys", async (c) => {
  const env = c.env;
  if (!env.ACCESS_EVAL_PRIVATE_KEY) {
    throw new HTTPException(500, { message: "ACCESS_EVAL_PRIVATE_KEY not configured" });
  }
  const privateKey = await importPKCS8(env.ACCESS_EVAL_PRIVATE_KEY, "ES256", { extractable: true });
  const jwk = await exportJWK(privateKey);
  // Strip the private parts.
  delete jwk.d;
  jwk.kid = env.ACCESS_EVAL_KEY_ID ?? "access-eval";
  jwk.alg = "ES256";
  jwk.use = "sig";
  return c.json({ keys: [jwk] });
});
