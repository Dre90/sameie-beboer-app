import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { verifyAccessJwt } from "./auth";
import type { AppVariables, User, UserRole, WorkerEnv } from "../types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

/**
 * Resolves the authenticated email from either:
 * - Cf-Access-Jwt-Assertion header (production)
 * - CF_Authorization cookie (browser requests)
 * - DEV_BYPASS_AUTH env var (local dev)
 *
 * Sets `jwtEmail` on the Hono context.
 */
export const requireAccessJwt = (): MiddlewareHandler<Ctx> => async (c, next) => {
  const env = c.env;

  if (env.DEV_BYPASS_AUTH === "true") {
    const email = env.DEV_USER_EMAIL?.toLowerCase();
    if (!email) {
      throw new HTTPException(500, { message: "DEV_BYPASS_AUTH set but DEV_USER_EMAIL missing" });
    }
    c.set("jwtEmail", email);
    await next();
    return;
  }

  const token =
    c.req.header("Cf-Access-Jwt-Assertion") ??
    getCookie(c.req.header("Cookie"), "CF_Authorization");

  if (!token) {
    throw new HTTPException(401, { message: "Missing Cloudflare Access token" });
  }

  try {
    const email = await verifyAccessJwt(token, env);
    c.set("jwtEmail", email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid token";
    throw new HTTPException(401, { message });
  }

  await next();
};

/**
 * Looks up the authenticated email in the `users` table and sets `user`
 * on the context. 403 if the email is not in the allowlist.
 *
 * Must run after `requireAccessJwt`.
 */
export const loadUser = (): MiddlewareHandler<Ctx> => async (c, next) => {
  const email = c.get("jwtEmail");
  const row = await c.env.DB.prepare(
    "SELECT email, name, role, created_at FROM users WHERE email = ?",
  )
    .bind(email)
    .first<User>();

  if (!row) {
    throw new HTTPException(403, {
      message: "Din e-post er ikke registrert i sameie-appen. Kontakt styret.",
    });
  }
  c.set("user", row);
  await next();
};

/**
 * Enforce that the loaded user has one of the given roles.
 * Must run after `loadUser`.
 */
export const requireRole =
  (...roles: UserRole[]): MiddlewareHandler<Ctx> =>
  async (c, next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { message: "Mangler nødvendig rolle" });
    }
    await next();
  };

function getCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return rest.join("=");
  }
  return undefined;
}
