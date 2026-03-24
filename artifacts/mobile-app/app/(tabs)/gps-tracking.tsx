import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

function fmtDate(d: string) { return d ? new Date(d).toLocaleString("uz-UZ") : "—"; }

const STATUS_COLOR: Record<string, string> = { online: "#22C55E", offline: "#9CA3AF", moving: "#3B82F6", idle: "#F59E0B" };
const STATUS_LABEL: Record<string, string> = { online: "Online", offline: "Offline", moving: "Harakatda", idle: "Kutmoqda" };

export default function GpsTrackingScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    (async () => {
      if (!user?.shopId) return;
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem("gethelp_token");
        const r = await fetch(`${BASE_URL}/gps/devices/shop/${user.shopId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { const d = await r.json(); setDevices(d.devices || []); }
      } catch {}
      setLoading(false);
    })();
  }, []));

  const online = devices.filter(d => d.status === "online" || d.status === "moving").length;
  const offline = devices.length - online;

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.surface, borderBottomColor: C.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </Pressable>
        <Text style={[styles.title, { color: C.text }]}>GPS Monitoring</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={C.primary} /></View>
      ) : (
        <FlatList
          data={devices}
          keyExtractor={i => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          ListHeaderComponent={() => (
            <View style={styles.statsRow}>
              {[
                { label: "Jami", value: devices.length, color: C.text },
                { label: "Online", value: online, color: "#22C55E" },
                { label: "Offline", value: offline, color: "#9CA3AF" },
              ].map((s, i) => (
                <View key={i} style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: C.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.center}>
              <Ionicons name="navigate-outline" size={64} color={C.textMuted} />
              <Text style={[styles.empty, { color: C.textMuted }]}>Hali GPS qurilmalar yo'q</Text>
              <Text style={[styles.emptyHint, { color: C.textMuted }]}>Veb sayt orqali qurilma qo'shing</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => {
            const sc = STATUS_COLOR[item.status] || C.textMuted;
            return (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.deviceIcon, { backgroundColor: sc + "20" }]}>
                    <Ionicons name="navigate" size={22} color={sc} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.deviceName, { color: C.text }]}>{item.device_name || item.model}</Text>
                    <Text style={[styles.deviceSerial, { color: C.textMuted }]}>S/N: {item.serial_number}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: sc + "20" }]}>
                    <View style={[styles.dot, { backgroundColor: sc }]} />
                    <Text style={[styles.badgeText, { color: sc }]}>{STATUS_LABEL[item.status] || item.status}</Text>
                  </View>
                </View>
                {item.tool_name && (
                  <View style={[styles.toolInfo, { backgroundColor: C.surfaceSecondary }]}>
                    <Ionicons name="construct-outline" size={14} color={C.textMuted} />
                    <Text style={[styles.toolText, { color: C.textMuted }]}>Asbob: {item.tool_name}</Text>
                  </View>
                )}
                {(item.latitude && item.longitude) && (
                  <View style={styles.locRow}>
                    <Ionicons name="location-outline" size={14} color={C.primary} />
                    <Text style={[styles.locText, { color: C.textMuted }]}>
                      {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                    </Text>
                  </View>
                )}
                {item.last_seen && (
                  <Text style={[styles.lastSeen, { color: C.textMuted }]}>Oxirgi ko'rinish: {fmtDate(item.last_seen)}</Text>
                )}
                {item.battery_level !== undefined && (
                  <View style={styles.battRow}>
                    <Ionicons name={item.battery_level > 20 ? "battery-half-outline" : "battery-dead-outline"} size={14} color={item.battery_level > 20 ? "#22C55E" : "#EF4444"} />
                    <Text style={[styles.battText, { color: C.textMuted }]}>Batareya: {item.battery_level}%</Text>
                  </View>
                )}
              </View>
            );
          }}
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 32, minHeight: 200 },
  empty: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center" },
  statVal: { fontSize: 24, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  deviceIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  deviceName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  deviceSerial: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  toolInfo: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  toolText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lastSeen: { fontSize: 11, fontFamily: "Inter_400Regular" },
  battRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  battText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
