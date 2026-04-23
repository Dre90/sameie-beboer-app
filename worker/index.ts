import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { loadUser, requireAccessJwt } from "./lib/middleware";
import { activitiesRoute } from "./routes/activities";
import { unitsRoute } from "./routes/units";
import { usersRoute } from "./routes/users";
import type { AppVariables, WorkerEnv } from "./types";

type Ctx = { Bindings: WorkerEnv; Variables: AppVariables };

const app = new Hono<Ctx>();

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  console.error("Unhandled worker error", err);
  return c.json({ error: "Internal server error" }, 500);
});

// Health check — no auth.
app.get("/api/health", (c) => c.json({ ok: true }));

// Current user info
app.get("/api/me", requireAccessJwt(), loadUser(), (c) => {
  return c.json({ user: c.get("user") });
});

app.route("/api/users", usersRoute);
app.route("/api/units", unitsRoute);
app.route("/api/activities", activitiesRoute);

// Fall-through 404 for unknown /api/* routes (so static asset handler isn't reached)
app.all("/api/*", (c) => c.json({ error: "Not found" }, 404));

export default app;
