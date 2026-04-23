import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { WorkerEnv } from "../types";

type AccessClaims = JWTPayload & {
  email?: string;
};

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

/**
 * Verify a Cloudflare Access JWT and return the email claim.
 *
 * Throws on any verification failure. Callers should translate errors
 * to HTTP 401.
 */
export async function verifyAccessJwt(
  token: string,
  env: Pick<WorkerEnv, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">,
): Promise<string> {
  if (!token) throw new Error("Missing Access JWT");
  if (!env.ACCESS_TEAM_DOMAIN) throw new Error("ACCESS_TEAM_DOMAIN not configured");
  if (!env.ACCESS_AUD) throw new Error("ACCESS_AUD not configured");

  const jwks = getJwks(env.ACCESS_TEAM_DOMAIN);
  const { payload } = await jwtVerify<AccessClaims>(token, jwks, {
    issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
    audience: env.ACCESS_AUD,
  });

  if (!payload.email || typeof payload.email !== "string") {
    throw new Error("JWT missing email claim");
  }
  return payload.email.toLowerCase();
}

/** For tests only: reset module-level caches. */
export function __resetJwksCacheForTests() {
  jwksCache.clear();
}
