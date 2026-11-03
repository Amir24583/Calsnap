import Anthropic from "@anthropic-ai/sdk";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import { RefusedError, UnparseableError, type AnalyzeInput, type MealAnalysis } from "./analyze.js";

export type Analyzer = (input: AnalyzeInput) => Promise<MealAnalysis>;

const AnalyzeRequest = z.object({
  imageBase64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
  note: z.string().max(500).optional(),
});

export function createApp(analyze: Analyzer, appToken?: string) {
  const app = new Hono();

  app.get("/health", (c) => c.json({ ok: true }));

  // The app resizes photos to ~1024px before upload, so 8 MB is generous.
  app.use("/analyze", bodyLimit({ maxSize: 8 * 1024 * 1024 }));

  app.post("/analyze", async (c) => {
    if (appToken && c.req.header("authorization") !== `Bearer ${appToken}`) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const parsed = AnalyzeRequest.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return c.json({ error: "Send JSON with imageBase64 and mediaType." }, 400);
    }

    try {
      return c.json(await analyze(parsed.data));
    } catch (error) {
      if (error instanceof RefusedError || error instanceof UnparseableError) {
        return c.json({ error: error.message }, 422);
      }
      if (error instanceof Anthropic.RateLimitError) {
        return c.json({ error: "Too many scans right now, try again in a minute." }, 429);
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`Anthropic API error ${error.status}:`, error.message);
        return c.json({ error: "The analysis service failed. Try again." }, 502);
      }
      throw error;
    }
  });

  return app;
}
