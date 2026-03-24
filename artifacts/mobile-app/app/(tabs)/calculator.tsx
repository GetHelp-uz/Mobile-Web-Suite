import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";

const TOOLS = [
  { name: "Perforator", daily: 80000, deposit: 300000 },
  { name: "Bolgar (UShM)", daily: 60000, deposit: 200000 },
  { name: "Generator", daily: 150000, deposit: 500000 },
  { name: "Beton aralashtirgich", daily: 120000, deposit: 400000 },
  { name: "Qoziq qoqgich", daily: 200000, deposit: 600000 },
  { name: "Svarochnik", daily: 100000, deposit: 350000 },
  { name: "Kompressor", daily: 90000, deposit: 280000 },
  { name: "Parma (drel)", daily: 50000, deposit: 150000 },
];
function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(Math.round(v)) + " so'm"; }

export default function CalculatorScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [days, setDays] = useState("7");
  const [selected, setSelected] = useState<Record<number, number>>({});

  const totalRent = TOOLS.reduce((s, t, i) => s + (selected[i] || 0) * t.daily * (Number(days) || 0), 0);
  const totalDeposit = TOOLS.reduce((s, t, i) => s + (selected[i] ? t.deposit : 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Loyiha kalkulyator</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Kunlar */}
        <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Ijara muddati</Text>
          <View style={styles.daysRow}>
            {["3","7","14","30"].map(d => (
              <Pressable key={d} onPress={() => setDays(d)}
                style={[styles.dayBtn, { borderColor: days === d ? C.primary : C.border, backgroundColor: days === d ? C.primary + "15" : "transparent" }]}>
                <Text style={[styles.dayBtnText, { color: days === d ? C.primary : C.textMuted }]}>{d} kun</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[styles.input, { color: C.text, borderColor: C.border, backgroundColor: C.surfaceSecondary }]}
            value={days} onChangeText={setDays} keyboardType="numeric" placeholder="Kun soni"
            placeholderTextColor={C.textMuted}
          />
        </View>

        {/* Asboblar */}
        <Text style={[styles.sectionTitle, { color: C.text, marginTop: 16, marginBottom: 8 }]}>Asboblarni tanlang</Text>
        {TOOLS.map((t, i) => {
          const qty = selected[i] || 0;
          return (
            <View key={i} style={[styles.toolRow, { backgroundColor: C.surface, borderColor: qty > 0 ? C.primary : C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toolName, { color: C.text }]}>{t.name}</Text>
                <Text style={[styles.toolPrice, { color: C.textMuted }]}>{fmt(t.daily)}/kun • Depozit: {fmt(t.deposit)}</Text>
              </View>
              <View style={styles.qtyRow}>
                <Pressable onPress={() => setSelected(p => ({ ...p, [i]: Math.max(0, (p[i] || 0) - 1) }))}
                  style={[styles.qtyBtn, { backgroundColor: C.surfaceSecondary }]}>
                  <Ionicons name="remove" size={18} color={C.text} />
                </Pressable>
                <Text style={[styles.qtyText, { color: C.text }]}>{qty}</Text>
                <Pressable onPress={() => setSelected(p => ({ ...p, [i]: (p[i] || 0) + 1 }))}
                  style={[styles.qtyBtn, { backgroundColor: C.primary }]}>
                  <Ionicons name="add" size={18} color="#fff" />
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Natija */}
        {(totalRent > 0 || totalDeposit > 0) && (
          <View style={[styles.result, { backgroundColor: C.primary + "10", borderColor: C.primary }]}>
            <Text style={[styles.resultTitle, { color: C.text }]}>Hisob-kitob</Text>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: C.textMuted }]}>Ijara ({days} kun)</Text>
              <Text style={[styles.resultValue, { color: C.text }]}>{fmt(totalRent)}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={[styles.resultLabel, { color: C.textMuted }]}>Depozit (qaytariladi)</Text>
              <Text style={[styles.resultValue, { color: C.text }]}>{fmt(totalDeposit)}</Text>
            </View>
            <View style={[styles.sep, { backgroundColor: C.border }]} />
            <View style={styles.resultRow}>
              <Text style={[styles.totalLabel, { color: C.text }]}>Jami to'lov</Text>
              <Text style={[styles.totalValue, { color: C.primary }]}>{fmt(totalRent + totalDeposit)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  daysRow: { flexDirection: "row", gap: 8 },
  dayBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, alignItems: "center" },
  dayBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, fontFamily: "Inter_400Regular" },
  toolRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8 },
  toolName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  toolPrice: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  qtyText: { fontSize: 16, fontFamily: "Inter_700Bold", width: 24, textAlign: "center" },
  result: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 10, marginTop: 8 },
  resultTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  resultRow: { flexDirection: "row", justifyContent: "space-between" },
  resultLabel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resultValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sep: { height: 1 },
  totalLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  totalValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
});
