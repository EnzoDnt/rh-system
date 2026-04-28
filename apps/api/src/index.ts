import { serve } from "@hono/node-server";
import { buildApp } from "./app.js";
import { mountRoutes } from "./routes/index.js";
import { loadEnv } from "@rh/config";

loadEnv(); // crash early on bad env
const app = buildApp();
mountRoutes(app);
const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port });
console.log(`api listening on :${port}`);
