import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { loadSettings, saveSettings, type Settings } from "../lib/store";
import { ui } from "../lib/theme";

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!settings) return null;

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings({ ...settings, [key]: value });

  async function save() {
    if (!settings) return;
    await saveSettings(settings);
    router.back();
  }

  return (
    <ScrollView style={ui.screen} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <View style={ui.card}>
        <Text style={ui.title}>Daily goals</Text>
        <Text style={ui.label}>Calories</Text>
        <TextInput
          style={ui.input}
          keyboardType="number-pad"
          value={String(settings.calorieGoal)}
          onChangeText={(t) => set("calorieGoal", Number(t.replace(/\D/g, "")) || 0)}
        />
        <Text style={ui.label}>Protein (g)</Text>
        <TextInput
          style={ui.input}
          keyboardType="number-pad"
          value={String(settings.proteinGoal)}
          onChangeText={(t) => set("proteinGoal", Number(t.replace(/\D/g, "")) || 0)}
        />
      </View>

      <View style={ui.card}>
        <Text style={ui.title}>Server</Text>
        <Text style={ui.label}>URL of the calsnap server, e.g. http://192.168.1.20:8787</Text>
        <TextInput
          style={ui.input}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          value={settings.serverUrl}
          onChangeText={(t) => set("serverUrl", t.trim())}
        />
        <Text style={ui.label}>App token (only if you set APP_TOKEN on the server)</Text>
        <TextInput
          style={ui.input}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          value={settings.appToken}
          onChangeText={(t) => set("appToken", t.trim())}
        />
      </View>

      <Pressable style={ui.button} onPress={save}>
        <Text style={ui.buttonText}>Save</Text>
      </Pressable>
    </ScrollView>
  );
}
