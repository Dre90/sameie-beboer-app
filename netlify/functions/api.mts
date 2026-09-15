import type { Config } from "@netlify/functions";
export { default } from "../../server/handler";
export const config: Config = { path: "/api/*", excludedPath: ["/api/login"] };
