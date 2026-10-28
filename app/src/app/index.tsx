import * as ImagePicker from "expo-image-picker";
import { Link, router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { deleteMeal, loadMeals, loadSettings, sumItems, type Meal, type Settings } from "../lib/store";
import { colors, ui } from "../lib/theme";

export default function Today() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  const refresh = useCallback(() => {
    loadMeals().then(setMeals);
    loadSettings().then(setSettings);
  }, []);
  useFocusEffect(refresh);

  const totals = sumItems(meals.flatMap((m) => m.items));
  const goal = settings?.calorieGoal ?? 2200;
  const left = Math.round(goal - totals.calories);
  const progress = Math.min(totals.calories / goal, 1);

  async function scan(source: "camera" | "library") {
    const permission =
      source === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow access in your phone's settings to scan meals.");
      return;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: "images", quality: 0.8 };
    const result =
      source === "camera"
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (!result.canceled) {
      router.push({ pathname: "/review", params: { uri: result.assets[0].uri } });
    }
  }

  function confirmDelete(meal: Meal) {
    Alert.alert("Delete meal?", meal.name, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteMeal(meal.id).then(refresh) },
    ]);
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/settings" style={styles.headerLink}>
              Settings
            </Link>
          ),
        }}
      />

      <View style={ui.card}>
        <Text style={ui.label}>{left >= 0 ? "Calories left" : "Over goal by"}</Text>
        <Text style={styles.big}>{Math.abs(left)}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%` }, left < 0 && styles.over]} />
        </View>
        <Text style={ui.label}>
          {Math.round(totals.calories)} eaten of {goal}
        </Text>
        <View style={styles.macros}>
          <Macro label="Protein" grams={totals.protein_g} color={colors.protein} goal={settings?.proteinGoal} />
          <Macro label="Carbs" grams={totals.carbs_g} color={colors.carbs} />
          <Macro label="Fat" grams={totals.fat_g} color={colors.fat} />
        </View>
      </View>

      <Pressable style={ui.button} onPress={() => scan("camera")}>
        <Text style={ui.buttonText}>Scan a meal</Text>
      </Pressable>
      <Pressable style={ui.secondaryButton} onPress={() => scan("library")}>
        <Text style={ui.secondaryButtonText}>Pick a photo</Text>
      </Pressable>

      <Text style={[ui.title, styles.sectionTitle]}>Meals</Text>
      {meals.length === 0 && <Text style={ui.label}>Nothing logged yet today.</Text>}
      {meals.map((meal) => {
        const t = sumItems(meal.items);
        return (
          <Pressable key={meal.id} style={ui.card} onLongPress={() => confirmDelete(meal)}>
            <View style={styles.row}>
              <Text style={styles.mealName}>{meal.name}</Text>
              <Text style={styles.mealCals}>{Math.round(t.calories)} kcal</Text>
            </View>
            <Text style={ui.label}>
              {new Date(meal.loggedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              {"  ·  "}P {Math.round(t.protein_g)}g  C {Math.round(t.carbs_g)}g  F {Math.round(t.fat_g)}g
            </Text>
          </Pressable>
        );
      })}
      {meals.length > 0 && <Text style={ui.label}>Long-press a meal to delete it.</Text>}
    </ScrollView>
  );
}

function Macro({ label, grams, color, goal }: { label: string; grams: number; color: string; goal?: number }) {
  return (
    <View style={styles.macro}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.macroText}>
        {Math.round(grams)}
        {goal ? `/${goal}` : ""}g
      </Text>
      <Text style={ui.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerLink: { color: colors.accent, fontSize: 16, fontWeight: "600" },
  big: { fontSize: 44, fontWeight: "800", color: colors.text },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: 10, backgroundColor: colors.accent },
  over: { backgroundColor: colors.danger },
  macros: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  macro: { alignItems: "center", flex: 1, gap: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  macroText: { fontSize: 16, fontWeight: "700", color: colors.text },
  sectionTitle: { marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mealName: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1 },
  mealCals: { fontSize: 16, fontWeight: "700", color: colors.text },
});
