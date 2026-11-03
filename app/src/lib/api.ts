import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { MealAnalysis, Settings } from "./store";

/** Shrinks the photo to 1024px wide JPEG; full-size photos cost more and add no accuracy. */
async function toJpegBase64(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1024 }).renderAsync();
  const result = await ref.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!result.base64) throw new Error("Could not read the photo.");
  return result.base64;
}

export async function analyzePhoto(
  uri: string,
  note: string,
  settings: Settings,
): Promise<MealAnalysis> {
  if (!settings.serverUrl) {
    throw new Error("Set the server URL in Settings first.");
  }
  const imageBase64 = await toJpegBase64(uri);
  const res = await fetch(`${settings.serverUrl.replace(/\/$/, "")}/analyze`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(settings.appToken ? { authorization: `Bearer ${settings.appToken}` } : {}),
    },
    body: JSON.stringify({ imageBase64, mediaType: "image/jpeg", note: note || undefined }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(body?.error ?? `Server returned ${res.status}`);
  }
  return body as MealAnalysis;
}
