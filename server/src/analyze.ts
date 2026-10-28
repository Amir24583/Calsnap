import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const DEFAULT_MODEL = "claude-opus-5-5";

export const FoodItem = z.object({
  name: z.string().describe("Short food name, e.g. 'grilled chicken breast'"),
  portion: z.string().describe("Human-readable portion, e.g. '1 cup' or '2 slices'"),
  grams: z.number().describe("Estimated weight in grams"),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
});

export const MealAnalysis = z.object({
  is_food: z.boolean().describe("False if the photo does not show food or drink"),
  meal_name: z.string().describe("Short title for the whole meal"),
  items: z.array(FoodItem),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z
    .string()
    .describe("One sentence on what was hard to judge (hidden oil, portion size), or empty"),
});

export type MealAnalysis = z.infer<typeof MealAnalysis>;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export interface AnalyzeInput {
  imageBase64: string;
  mediaType: ImageMediaType;
  /** Optional hint from the user, e.g. "large portion, cooked in butter". */
  note?: string;
}

export class RefusedError extends Error {}
export class UnparseableError extends Error {}

const SYSTEM = `You are a nutrition estimator inside a calorie tracking app.
The user sends a photo of a meal. Identify each distinct food or drink, estimate its portion
from visual cues (plate size, utensils, packaging), and estimate calories and macros per item
using typical USDA-style values. Count likely cooking oils, sauces and dressings as their own
items when they are visible or very likely. Be realistic rather than conservative: people
usually underestimate portions. If the user adds a note, trust it over the photo.
If the photo shows no food, set is_food to false and return an empty items list.`;

export async function analyzeMeal(
  client: Anthropic,
  input: AnalyzeInput,
  model: string = DEFAULT_MODEL,
): Promise<MealAnalysis> {
  const text = input.note
    ? `Estimate this meal. Note from the user: ${input.note}`
    : "Estimate this meal.";

  const response = await client.beta.messages.parse({
    model,
    max_tokens: 16000,
    system: SYSTEM,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(MealAnalysis) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: input.mediaType, data: input.imageBase64 },
          },
          { type: "text", text },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    throw new RefusedError(response.stop_details?.explanation ?? "The model declined this image.");
  }
  if (!response.parsed_output) {
    throw new UnparseableError(`No structured output (stop_reason: ${response.stop_reason})`);
  }
  return response.parsed_output;
}
