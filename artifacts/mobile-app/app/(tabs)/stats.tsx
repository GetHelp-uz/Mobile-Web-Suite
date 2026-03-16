import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl
} from "react-native";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  return domain ? `https://${domain}/api` : "";
}

function formatCurrency(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M so'm`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K so'm`;
  return `${n.toLocaleString()} so'm`;
}

function shortDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}.${(dt.getMonth() + 1).toString().padStart(2, "0")}`;
}

function StatCard({ title, value, icon, color, sub }: any) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: C.textSecondary }]}>{title}</Text>
      {sub ? <Text style={[styles.statSub, { color: C.textSecondary }]}>{sub}</Text> : null}
    </View>
  );
}

function MiniBar({ bars }: { bars: Array<{ label: string; value: number; max: number }> }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={{ gap: 10 }}>
      {bars.map(b => (
        <View key={b.label} style={styles.barRow}>
          <Text style={[styles.barLabel, { color: C.textSecondary }]}>{b.label}</Text>
          <View style={[styles.barTrack, { backgroundColor: C.background }]}>
            <View style={[styles.barFill, { width: `${b.max > 0 ? Math.round(b.value / b.max * 100) : 0}%` }]} />
          </View>
          <Text style={[styles.barValue, { color: C.text }]}>{b.value}</Text>
        </View>
      ))}
    </View>
  );
}

export default function StatsTab() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const baseUrl = getBaseUrl();
  const h = { Authorization: `Bearer ${token}` };
  const shopId = user?.shopId || 0;

  const [dash, setDash] = useState<any>(null);
  const [toolStats, setToolStats] = useState<any>(null);
  const [ratings, setRatings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [d, t, r] = await Promise.all([
        fetch(`${baseUrl}/analytics/dashboard?shopId=${shopId}`, { headers: h }).then(x => x.json()),
        fetch(`${baseUrl}/analytics/tools?shopId=${shopId}`, { headers: h }).then(x => x.json()),
        fetch(`${baseUrl}/ratings/shop/${shopId}`, { headers: h }).then(x => x.json()),
      ]);
      setDash(d); setToolStats(t); setRatings(r);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token, shopId]);

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  const maxRevenue = Math.max(...(dash?.revenueByPeriod || []).map((r: any) => r.revenue), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: C.text }]}>Statistika</Text>
        <Text style={[styles.subtitle, { color: C.textSecondary }]}>Do'kon ko'rsatkichlari</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#f97316" />
        ) : (
          <>
            {/* Raqamlar */}
            <View style={styles.statsGrid}>
              <StatCard title="Jami daromad" value={formatCurrency(dash?.totalRevenue || 0)} icon="trending-up" color="#22c55e" />
              <StatCard title="Faol ijaralar" value={dash?.activeRentals || 0} icon="time-outline" color="#f97316" />
              <StatCard title="Jami asboblar" value={dash?.totalTools || 0} icon="build-outline" color="#3b82f6" sub={`${dash?.availableTools || 0} mavjud`} />
              <StatCard title="Muddati o'tgan" value={dash?.overdueRentals || 0} icon="alert-circle-outline" color="#ef4444" />
            </View>

            {/* Daromad grafigi */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>So'ngi 7 kun</Text>
              <View style={styles.barsContainer}>
                {(dash?.revenueByPeriod || []).map((r: any) => {
                  const pct = maxRevenue > 0 ? r.revenue / maxRevenue : 0;
                  return (
                    <View key={r.date} style={styles.barItem}>
                      <Text style={[styles.barItemVal, { color: C.textSecondary }]}>
                        {r.revenue >= 1000 ? `${Math.round(r.revenue/1000)}K` : r.revenue || ""}
                      </Text>
                      <View style={[styles.barItemTrack, { backgroundColor: C.background }]}>
                        <View style={[styles.barItemFill, { height: `${Math.max(4, pct * 100)}%` }]} />
                      </View>
                      <Text style={[styles.barItemDate, { color: C.textSecondary }]}>{shortDate(r.date)}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Asbob holati */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Asbob holati</Text>
              <View style={styles.statusRow}>
                {[
                  { label: "Mavjud", val: dash?.availableTools || 0, color: "#22c55e" },
                  { label: "Ijarada", val: dash?.rentedTools || 0, color: "#f97316" },
                  { label: "Jami", val: dash?.totalTools || 0, color: "#3b82f6" },
                ].map(s => (
                  <View key={s.label} style={styles.statusItem}>
                    <Text style={[styles.statusVal, { color: s.color }]}>{s.val}</Text>
                    <Text style={[styles.statusLabel, { color: C.textSecondary }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Reyting */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <View style={styles.ratingHeader}>
                <Text style={[styles.cardTitle, { color: C.text }]}>Reyting</Text>
                <View style={styles.ratingBig}>
                  <Ionicons name="star" size={18} color="#f59e0b" />
                  <Text style={[styles.ratingBigText, { color: C.text }]}>{ratings?.average?.toFixed(1) || "0.0"}</Text>
                  <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>({ratings?.count || 0})</Text>
                </View>
              </View>
              <MiniBar bars={[5,4,3,2,1].map(s => ({
                label: `${s}★`,
                value: (ratings?.ratings || []).filter((r: any) => r.rating === s).length,
                max: ratings?.count || 1,
              }))} />
            </View>

            {/* Top asboblar */}
            {(toolStats?.topRentedTools || []).length > 0 && (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.text }]}>Top asboblar</Text>
                {toolStats.topRentedTools.map((t: any, i: number) => (
                  <View key={t.toolId} style={[styles.topRow, i < toolStats.topRentedTools.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                    <Text style={[styles.topRank, { color: "#f97316" }]}>#{i+1}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.topName, { color: C.text }]}>{t.toolName}</Text>
                      <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>{t.totalRentals} ta ijara</Text>
                    </View>
                    <Text style={[styles.topRev, { color: "#22c55e" }]}>{formatCurrency(t.totalRevenue)}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: 16 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: { width: "47%", borderRadius: 16, borderWidth: 1, padding: 14 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: "800" },
  statTitle: { fontSize: 12, marginTop: 2 },
  statSub: { fontSize: 11, marginTop: 1 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 14 },
  barsContainer: { flexDirection: "row", alignItems: "flex-end", gap: 6, height: 120 },
  barItem: { flex: 1, alignItems: "center", height: "100%" },
  barItemVal: { fontSize: 9, marginBottom: 2, textAlign: "center" },
  barItemTrack: { flex: 1, width: "100%", borderRadius: 6, overflow: "hidden", justifyContent: "flex-end" },
  barItemFill: { backgroundColor: "#f97316", borderRadius: 6, width: "100%" },
  barItemDate: { fontSize: 9, marginTop: 4 },
  statusRow: { flexDirection: "row", justifyContent: "space-around" },
  statusItem: { alignItems: "center" },
  statusVal: { fontSize: 28, fontWeight: "800" },
  statusLabel: { fontSize: 12, marginTop: 2 },
  ratingHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  ratingBig: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingBigText: { fontSize: 18, fontWeight: "700" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { width: 26, fontSize: 12, textAlign: "right" },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#f59e0b", borderRadius: 4 },
  barValue: { width: 24, fontSize: 12, textAlign: "right" },
  topRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  topRank: { fontSize: 16, fontWeight: "700", width: 28 },
  topName: { fontSize: 14, fontWeight: "600" },
  topRev: { fontSize: 13, fontWeight: "700" },
});
