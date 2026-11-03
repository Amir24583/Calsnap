import Anthropic from "@anthropic-ai/sdk";
import { serve } from "@hono/node-server";
import { analyzeMeal, DEFAULT_MODEL } from "./analyze.js";
import { createApp } from "./app.js";

try {
  process.loadEnvFile(".env");
} catch {
  // No .env file; rely on the real environment.
}

const client = new Anthropic();
const model = process.env.CLAUDE_MODEL || DEFAULT_MODEL;
const port = Number(process.env.PORT ?? 8787);

const app = createApp((input) => analyzeMeal(client, input, model), process.env.APP_TOKEN || undefined);

// 0.0.0.0 so a phone on the same Wi-Fi can reach your laptop during development.
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`calsnap server on http://localhost:${info.port} using ${model}`);
});
