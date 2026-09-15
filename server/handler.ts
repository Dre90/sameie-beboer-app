import { getDatabase } from "@netlify/database";
import type { Context } from "@netlify/functions";
import { app } from "./app";
import { createStore } from "./store";

export default function handler(request: Request, context: Context) {
  return app.fetch(request, {
    store: createStore(getDatabase()),
    ip: context.ip,
    settings: {
      boardHash: Netlify.env.get("BOARD_PASSWORD_HASH") ?? "",
      craftsmanHash: Netlify.env.get("CRAFTSMAN_PASSWORD_HASH") ?? "",
      craftsmanAccessUntil: Netlify.env.get("CRAFTSMAN_ACCESS_UNTIL") ?? "",
      eventDate: Netlify.env.get("FILTER_EVENT_DATE") ?? "",
      local: Netlify.env.get("NETLIFY_DEV") === "true",
    },
  });
}
