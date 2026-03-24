import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Pressable, StyleSheet, Switch, Text, TextInput, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmt(v: number) { return new Intl.NumberFormat("uz-UZ").format(v) + " so'm"; }

export default function DeliveryScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    deliveryEnabled: false,
    freeDeliveryThreshold: "",
    baseDeliveryFee: "",
    deliveryRadius: "",
    deliveryNote: "",
    expressFee: "",
    expressAvailable: false,
    pickupAvailable: true,
  });

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.shopId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/delivery/settings/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
          const s = await r.json();
          setSettings({
            deliveryEnabled: !!s.is_active,
            freeDeliveryThreshold: String(s.free_km || ""),
            baseDeliveryFee: String(s.base_price || ""),
            deliveryRadius: String(s.max_km || ""),
            deliveryNote: s.notes || "",
            expressFee: String(s.price_per_km || ""),
            expressAvailable: false,
            pickupAvailable: true,
          });
        }
      } catch {}
      setLoading(false);
    })();
  }, []));

  async function save() {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      await fetch(`${BASE_URL}/delivery/settings/${user?.shopId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          is_active: settings.deliveryEnabled,
          base_price: settings.baseDeliveryFee ? Number(settings.baseDeliveryFee) : 0,
          price_per_km: settings.expressFee ? Number(settings.expressFee) : 0,
          free_km: settings.freeDeliveryThreshold ? Number(settings.freeDeliveryThreshold) : 0,
          max_km: settings.deliveryRadius ? Number(settings.deliveryRadius) : 50,
          min_km: 1,
          notes: settings.deliveryNote,
        }),
      });
      Alert.alert("Saqlandi", "Yetkazib berish sozlamalari yangilandi");
    } catch {
      Alert.alert("Xatolik", "Saqlashda muammo yuz berdi");
    }
    setSaving(false);
  }

  function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View style={[styles.row, { backgroundColor: C.surface, borderColor: C.border }]}>
        <Text style={[styles.rowLabel, { color: C.text }]}>{label}</Text>
        {children}
      </View>
    );
  }

  if (loading) return <View style={[styles.root, { backgroundColor: C.background, justifyContent: "center", alignItems: "center" }]}><ActivityIndicator size="large" color={C.primary} /></View>;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={22} color={C.text} /></Pressable>
        <Text style={[styles.title, { color: C.text }]}>Yetkazib berish</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}>
        <Text style={[styles.sec, { color: C.text }]}>Asosiy sozlamalar</Text>
        <Row label="Yetkazib berish mavjud">
          <Switch value={settings.deliveryEnabled} onValueChange={v => setSettings(p => ({ ...p, deliveryEnabled: v }))} trackColor={{ true: C.primary + "80" }} thumbColor={settings.deliveryEnabled ? C.primary : C.textMuted} />
        </Row>
        <Row label="O'zi olib ketish"><Switch value={settings.pickupAvailable} onValueChange={v => setSettings(p => ({ ...p, pickupAvailable: v }))} trackColor={{ true: C.primary + "80" }} thumbColor={settings.pickupAvailable ? C.primary : C.textMuted} /></Row>

        {settings.deliveryEnabled && (
          <>
            <Text style={[styles.sec, { color: C.text }]}>Narxlar</Text>
            {([["baseDeliveryFee", "Asosiy narx (so'm)"], ["freeDeliveryThreshold", "Bepul yetkazish (buyurtma summasidan)"], ["expressFee", "Tezkor yetkazish narxi (so'm)"]] as const).map(([k, label]) => (
              <View key={k} style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.inputLabel, { color: C.textMuted }]}>{label}</Text>
                <TextInput style={[styles.textInput, { color: C.text }]} value={settings[k as keyof typeof settings] as string}
                  onChangeText={t => setSettings(p => ({ ...p, [k]: t }))} keyboardType="numeric" placeholder="0" placeholderTextColor={C.textMuted} />
              </View>
            ))}
            <Row label="Tezkor yetkazish mavjud"><Switch value={settings.expressAvailable} onValueChange={v => setSettings(p => ({ ...p, expressAvailable: v }))} trackColor={{ true: C.primary + "80" }} thumbColor={settings.expressAvailable ? C.primary : C.textMuted} /></Row>

            <Text style={[styles.sec, { color: C.text }]}>Qo'shimcha</Text>
            <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.inputLabel, { color: C.textMuted }]}>Yetkazish masofasi (km)</Text>
              <TextInput style={[styles.textInput, { color: C.text }]} value={settings.deliveryRadius} onChangeText={t => setSettings(p => ({ ...p, deliveryRadius: t }))} keyboardType="numeric" placeholder="10" placeholderTextColor={C.textMuted} />
            </View>
            <View style={[styles.inputWrap, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.inputLabel, { color: C.textMuted }]}>Izoh (mijozlarga ko'rinadi)</Text>
              <TextInput style={[styles.textInput, { color: C.text }]} value={settings.deliveryNote} onChangeText={t => setSettings(p => ({ ...p, deliveryNote: t }))} placeholder="Masalan: 9:00-18:00 oralig'ida yetkazamiz" placeholderTextColor={C.textMuted} multiline />
            </View>
          </>
        )}

        <Pressable onPress={save} disabled={saving} style={[styles.saveBtn, { backgroundColor: C.primary, opacity: saving ? 0.7 : 1 }]}>
          <Text style={styles.saveBtnText}>{saving ? "Saqlanmoqda..." : "Saqlash"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  sec: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  inputWrap: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 8 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  textInput: { fontSize: 15, fontFamily: "Inter_400Regular" },
  saveBtn: { paddingVertical: 16, borderRadius: 16, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
});
