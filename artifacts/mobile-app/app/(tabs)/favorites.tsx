import { Ionicons, Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator, Alert, FlatList, Image, Pressable,
  StyleSheet, Text, View, useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("uz-UZ").format(v) + " so'm";
}

export default function FavoritesScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("gethelp_token");
      const r = await fetch(`${BASE_URL}/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.ok) {
        const d = await r.json();
        setItems(d.favorites || []);
      }
    } catch {}
    setLoading(false);
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  async function remove(toolId: number) {
    Alert.alert("Sevimlilardan o'chirish", "Haqiqatan ham o'chirmoqchimisiz?", [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish", style: "destructive",
        onPress: async () => {
          const token = await AsyncStorage.getItem("gethelp_token");
          await fetch(`${BASE_URL}/favorites/${toolId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          setItems(prev => prev.filter(i => i.tool_id !== toolId && i.id !== toolId));
        },
      },
    ]);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>Sevimli asboblar</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="heart-outline" size={64} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Hali sevimli asboblar yo'q</Text>
          <Pressable onPress={() => router.push("/(tabs)")} style={[styles.browseBtn, { backgroundColor: C.primary }]}>
            <Text style={styles.browseBtnText}>Asboblarni ko'rish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => String(i.tool_id || i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => router.push(`/tool/${item.tool_id || item.id}` as any)}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, { backgroundColor: C.surfaceSecondary, justifyContent: "center", alignItems: "center" }]}>
                  <Ionicons name="construct-outline" size={28} color={C.textMuted} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={[styles.toolName, { color: C.text }]} numberOfLines={1}>{item.name || item.tool_name}</Text>
                <Text style={[styles.cat, { color: C.textMuted }]}>{item.category}</Text>
                <Text style={[styles.price, { color: C.primary }]}>{formatCurrency(item.price_per_day || 0)} / kun</Text>
                {item.shop_name && (
                  <Text style={[styles.shop, { color: C.textSecondary }]} numberOfLines={1}>
                    <Feather name="map-pin" size={11} /> {item.shop_name}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => remove(item.tool_id || item.id)} hitSlop={12}>
                <Ionicons name="heart" size={22} color="#EF4444" />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontFamily: "Inter_700Bold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  emptyText: { fontSize: 16, fontFamily: "Inter_400Regular", marginTop: 8 },
  browseBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  browseBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  card: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 12, gap: 12, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  info: { flex: 1, gap: 3 },
  toolName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cat: { fontSize: 12, fontFamily: "Inter_400Regular" },
  price: { fontSize: 14, fontFamily: "Inter_700Bold" },
  shop: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
