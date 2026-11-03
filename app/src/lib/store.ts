import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

export type FoodItem = {
  name: string;
  portion: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MealAnalysis = {
  is_food: boolean;
  meal_name: string;
  items: FoodItem[];
  confidence: "low" | "medium" | "high";
  notes: string;
};

export type Meal = {
  id: string;
  loggedAt: string;
  name: string;
  items: FoodItem[];
};

export type Settings = {
  calorieGoal: number;
  proteinGoal: number;
  serverUrl: string;
  appToken: string;
};

export type Totals = Pick<FoodItem, "calories" | "protein_g" | "carbs_g" | "fat_g">;

const SETTINGS_KEY = "settings";
const mealsKey = (day: string) => `meals:${day}`;

/** Local calendar day, e.g. "2026-10-28". */
export function dayKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function sumItems(items: FoodItem[]): Totals {
  return items.reduce<Totals>(
    (t, i) => ({
      calories: t.calories + i.calories,
      protein_g: t.protein_g + i.protein_g,
      carbs_g: t.carbs_g + i.carbs_g,
      fat_g: t.fat_g + i.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

// In development the phone loads the app from your laptop, so the backend is
// on the same host as the Expo dev server, port 8787.
function defaultServerUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  return host ? `http://${host}:8787` : "";
}

export async function loadSettings(): Promise<Settings> {
  const saved = await AsyncStorage.getItem(SETTINGS_KEY);
  return {
    calorieGoal: 2200,
    proteinGoal: 140,
    serverUrl: defaultServerUrl(),
    appToken: "",
    ...(saved ? (JSON.parse(saved) as Partial<Settings>) : {}),
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadMeals(day = dayKey()): Promise<Meal[]> {
  const saved = await AsyncStorage.getItem(mealsKey(day));
  return saved ? (JSON.parse(saved) as Meal[]) : [];
}

export async function addMeal(meal: Omit<Meal, "id" | "loggedAt">): Promise<void> {
  const now = new Date();
  const day = dayKey(now);
  const meals = await loadMeals(day);
  meals.push({ ...meal, id: `${now.getTime()}`, loggedAt: now.toISOString() });
  await AsyncStorage.setItem(mealsKey(day), JSON.stringify(meals));
}

export async function deleteMeal(id: string, day = dayKey()): Promise<void> {
  const meals = await loadMeals(day);
  await AsyncStorage.setItem(mealsKey(day), JSON.stringify(meals.filter((m) => m.id !== id)));
}
