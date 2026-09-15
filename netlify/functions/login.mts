import type { Config } from "@netlify/functions";
export { default } from "../../server/handler";
export const config: Config = {
  path: "/api/login",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: "ip",
    windowSize: 900,
    windowLimit: 10,
  },
};
