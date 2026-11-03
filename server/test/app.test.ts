import { describe, expect, it, vi } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { analyzeMeal, RefusedError, type MealAnalysis } from "../src/analyze.js";
import { createApp } from "../src/app.js";

const meal: MealAnalysis = {
  is_food: true,
  meal_name: "Chicken and rice",
  items: [
    { name: "grilled chicken", portion: "1 breast", grams: 170, calories: 280, protein_g: 53, carbs_g: 0, fat_g: 6 },
    { name: "white rice", portion: "1 cup", grams: 158, calories: 205, protein_g: 4, carbs_g: 45, fat_g: 0.4 },
  ],
  confidence: "medium",
  notes: "",
};

const body = { imageBase64: "aGVsbG8=", mediaType: "image/jpeg" };
const post = (app: ReturnType<typeof createApp>, json: unknown, headers: Record<string, string> = {}) =>
  app.request("/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(json),
  });

describe("POST /analyze", () => {
  it("returns the analysis", async () => {
    const analyze = vi.fn().mockResolvedValue(meal);
    const res = await post(createApp(analyze), { ...body, note: "big portion" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(meal);
    expect(analyze).toHaveBeenCalledWith({ ...body, note: "big portion" });
  });

  it("rejects bad input", async () => {
    const res = await post(createApp(vi.fn()), { imageBase64: "", mediaType: "image/bmp" });
    expect(res.status).toBe(400);
  });

  it("requires the app token when one is set", async () => {
    const app = createApp(vi.fn().mockResolvedValue(meal), "secret");
    expect((await post(app, body)).status).toBe(401);
    expect((await post(app, body, { authorization: "Bearer secret" })).status).toBe(200);
  });

  it("maps refusals to 422", async () => {
    const res = await post(createApp(vi.fn().mockRejectedValue(new RefusedError("no"))), body);
    expect(res.status).toBe(422);
  });
});

describe("analyzeMeal", () => {
  const fakeClient = (response: object) => {
    const parse = vi.fn().mockResolvedValue(response);
    return { client: { beta: { messages: { parse } } } as unknown as Anthropic, parse };
  };

  it("sends the photo and returns parsed output", async () => {
    const { client, parse } = fakeClient({ stop_reason: "end_turn", parsed_output: meal });
    await expect(analyzeMeal(client, { ...body, mediaType: "image/jpeg", note: "fried" })).resolves.toEqual(meal);
    const params = parse.mock.calls[0][0];
    expect(params.model).toBe("claude-opus-5-5");
    expect(params.messages[0].content[0].source).toEqual({ type: "base64", media_type: "image/jpeg", data: body.imageBase64 });
    expect(params.messages[0].content[1].text).toContain("fried");
  });

  it("throws RefusedError on refusal", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", stop_details: { explanation: "x" }, parsed_output: null });
    await expect(analyzeMeal(client, { ...body, mediaType: "image/jpeg" })).rejects.toBeInstanceOf(RefusedError);
  });
});
