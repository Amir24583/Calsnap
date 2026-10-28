import { StyleSheet } from "react-native";

export const colors = {
  bg: "#F6F7F9",
  card: "#FFFFFF",
  text: "#111418",
  muted: "#6B7280",
  accent: "#16A34A",
  accentSoft: "#DCFCE7",
  danger: "#DC2626",
  border: "#E5E7EB",
  protein: "#2563EB",
  carbs: "#D97706",
  fat: "#DB2777",
};

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  label: { fontSize: 13, color: colors.muted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  secondaryButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: { color: colors.accent, fontSize: 16, fontWeight: "600" },
});
