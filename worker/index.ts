import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loadUser, requireAccessJwt } from "./lib/middleware";
import { accessEvalRoute } from "./routes/access-eval";
import { activitiesRoute } from "./routes/activities";
import { authCheckRoute } from "./routes/auth-check";
import { unitsRoute } from "./routes/units";
import { usersRoute } from "./routes/users";
import type { AppVariables, WorkerEnv } from "./types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

const app = new Hono<Ctx>();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    c.header("Cache-Control", "no-store");
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled worker error", err);
  c.header("Cache-Control", "no-store");
  return c.json({ error: "Internal server error" }, 500);
});

// Health check — no auth.
app.get("/api/health", (c) => c.json({ ok: true }));

// Current user info
app.get("/api/me", requireAccessJwt(), loadUser(), (c) => {
  c.header("Cache-Control", "no-store");
  return c.json({ user: c.get("user") });
});

// Login redirect — protected path so Cloudflare Access starts the OTP flow,
// then sends the user back to the SPA root.
app.get("/api/login", requireAccessJwt(), (c) => {
  return c.redirect("/");
});

// Logout — clear Access session cookie and redirect home.
app.get("/api/logout", (c) => {
  return c.redirect("/cdn-cgi/access/logout");
});

app.route("/api/users", usersRoute);
app.route("/api/units", unitsRoute);
app.route("/api/activities", activitiesRoute);
app.route("/api/access/external-eval", accessEvalRoute);
app.route("/api/auth", authCheckRoute);

// Fall-through 404 for unknown /api/* routes (so static asset handler isn't reached)
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
