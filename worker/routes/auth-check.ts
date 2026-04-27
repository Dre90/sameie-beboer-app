import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { WorkerEnv } from "../types";

type Ctx = { Bindings: WorkerEnv };

/**
 * Public endpoint to check whether an email is registered in the users
 * allowlist. Used by the custom login page so we can avoid triggering an
 * Access OTP for unregistered addresses.
 *
 * Must be exposed via a Cloudflare Access bypass policy so the worker
 * receives the request without authentication.
 */
export const authCheckRoute = new Hono<Ctx>();

authCheckRoute.post("/check", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    throw new HTTPException(400, { message: "Ugyldig e-post" });
  }
  const row = await c.env.DB.prepare("SELECT email FROM users WHERE email = ?")
    .bind(email)
    .first<{ email: string }>();
  c.header("Cache-Control", "no-store");
  return c.json({ registered: row != null });
});
