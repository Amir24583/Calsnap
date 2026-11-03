import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { analyzePhoto } from "../lib/api";
import { addMeal, loadSettings, sumItems, type FoodItem, type MealAnalysis } from "../lib/store";
import { colors, ui } from "../lib/theme";

const SCALES = [0.5, 1, 1.5, 2];
const NUMBER_FIELDS = [
  ["calories", "kcal"],
  ["protein_g", "protein"],
  ["carbs_g", "carbs"],
  ["fat_g", "fat"],
] as const;

export default function Review() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [name, setName] = useState("");
  const [items, setItems] = useState<FoodItem[]>([]);
  const [scale, setScale] = useState(1);

  const run = useCallback(
    async (hint: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await analyzePhoto(uri, hint, await loadSettings());
        setAnalysis(result);
        setName(result.meal_name);
        setItems(result.items);
        setScale(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [uri],
  );

  useEffect(() => {
    run("");
  }, [run]);

  const scaled = items.map((i) => ({
    ...i,
    grams: i.grams * scale,
    calories: i.calories * scale,
    protein_g: i.protein_g * scale,
    carbs_g: i.carbs_g * scale,
    fat_g: i.fat_g * scale,
  }));
  const totals = sumItems(scaled);

  function updateItem(index: number, patch: Partial<FoodItem>) {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  async function save() {
    await addMeal({ name: name || "Meal", items: scaled });
    router.back();
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      {uri ? <Image source={{ uri }} style={styles.photo} /> : null}

      {loading && (
        <View style={[ui.card, styles.center]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={ui.label}>Estimating calories…</Text>
        </View>
      )}

      {error && !loading && (
        <View style={ui.card}>
          <Text style={styles.error}>{error}</Text>
          <Pressable style={ui.secondaryButton} onPress={() => run(note)}>
            <Text style={ui.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      )}

      {analysis && !analysis.is_food && !loading && (
        <View style={ui.card}>
          <Text style={ui.title}>No food found</Text>
          <Text style={ui.label}>Try another photo, or add a note describing the meal below.</Text>
        </View>
      )}

      {analysis && analysis.is_food && !loading && (
        <>
          <View style={ui.card}>
            <TextInput style={[ui.input, styles.nameInput]} value={name} onChangeText={setName} />
            <Text style={styles.total}>{Math.round(totals.calories)} kcal</Text>
            <Text style={ui.label}>
              P {Math.round(totals.protein_g)}g · C {Math.round(totals.carbs_g)}g · F{" "}
              {Math.round(totals.fat_g)}g · {analysis.confidence} confidence
            </Text>
            {analysis.notes ? <Text style={ui.label}>{analysis.notes}</Text> : null}
            <Text style={[ui.label, styles.scaleLabel]}>How much did you eat?</Text>
            <View style={styles.chips}>
              {SCALES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setScale(s)}
                  style={[styles.chip, s === scale && styles.chipActive]}
                >
                  <Text style={[styles.chipText, s === scale && styles.chipTextActive]}>{s}×</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {items.map((item, index) => (
            <View key={index} style={ui.card}>
              <View style={styles.row}>
                <TextInput
                  style={[ui.input, styles.itemName]}
                  value={item.name}
                  onChangeText={(t) => updateItem(index, { name: t })}
                />
                <Pressable onPress={() => setItems(items.filter((_, i) => i !== index))}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
              <Text style={ui.label}>
                {item.portion} · about {Math.round(item.grams)} g
              </Text>
              <View style={styles.row}>
                {NUMBER_FIELDS.map(([key, label]) => (
                  <View key={key} style={styles.field}>
                    <TextInput
                      style={[ui.input, styles.numberInput]}
                      keyboardType="number-pad"
                      value={String(Math.round(item[key]))}
                      onChangeText={(t) => updateItem(index, { [key]: Number(t.replace(/\D/g, "")) || 0 })}
                    />
                    <Text style={ui.label}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}

      {!loading && (
        <View style={ui.card}>
          <Text style={ui.label}>Something off? Add a hint and re-scan.</Text>
          <TextInput
            style={ui.input}
            placeholder="e.g. cooked in butter, large bowl"
            value={note}
            onChangeText={setNote}
          />
          <Pressable style={ui.secondaryButton} onPress={() => run(note)}>
            <Text style={ui.secondaryButtonText}>Re-scan with hint</Text>
          </Pressable>
        </View>
      )}

      {analysis?.is_food && !loading && items.length > 0 && (
        <Pressable style={ui.button} onPress={save}>
          <Text style={ui.buttonText}>Log meal</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { width: "100%", aspectRatio: 4 / 3, borderRadius: 16 },
  center: { alignItems: "center" },
  error: { color: colors.danger, fontSize: 15 },
  nameInput: { fontSize: 18, fontWeight: "700" },
  total: { fontSize: 32, fontWeight: "800", color: colors.text },
  scaleLabel: { marginTop: 8 },
  chips: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent },
  chipText: { color: colors.text, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemName: { flex: 1 },
  remove: { color: colors.danger, fontWeight: "600" },
  field: { flex: 1, alignItems: "center", gap: 2 },
  numberInput: { width: "100%", textAlign: "center" },
});
