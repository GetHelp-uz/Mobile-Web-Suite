import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl, Modal, TextInput, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STATUS_CONF: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Kutilmoqda",    color: "#D97706", bg: "#FEF3C7" },
  confirmed: { label: "Tasdiqlandi",   color: "#059669", bg: "#D1FAE5" },
  cancelled: { label: "Bekor qilindi", color: "#DC2626", bg: "#FEE2E2" },
  completed: { label: "Bajarildi",     color: "#6B7280", bg: "#F3F4F6" },
};

function formatCurrency(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

export default function BookingsScreen() {
  const { user } = useAuth();
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const d = await api.bookings.list();
      setBookings(d.bookings || []);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: number) => {
    Alert.alert("Bronni bekor qilish", "Haqiqatan ham bekor qilmoqchimisiz?", [
      { text: "Yo'q", style: "cancel" },
      { text: "Ha, bekor qilish", style: "destructive", onPress: async () => {
        await api.bookings.cancel(id);
        load();
      }},
    ]);
  };

  const filtered = filter === "all" ? bookings : bookings.filter(b => b.status === filter);

  return (
    <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <Text style={[styles.title, { color: C.text }]}>Bronlarim</Text>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {[["all","Barchasi"],["pending","Kutilmoqda"],["confirmed","Tasdiqlandi"],["cancelled","Bekor"]].map(([v, l]) => (
          <TouchableOpacity key={v} onPress={() => setFilter(v)}
            style={[styles.filterBtn, filter === v && { backgroundColor: C.tint }]}>
            <Text style={[styles.filterText, { color: filter === v ? "#fff" : C.tabIconDefault }]}>{l}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}/>} contentContainerStyle={{ padding: 16, gap: 12 }}>
        {loading ? (
          [...Array(4)].map((_,i) => <View key={i} style={[styles.skeleton, { backgroundColor: C.surface }]}/>)
        ) : filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={C.tabIconDefault} style={{ marginBottom: 12 }}/>
            <Text style={[styles.emptyTitle, { color: C.text }]}>Bronlar yo'q</Text>
            <Text style={[styles.emptyText, { color: C.tabIconDefault }]}>Asbobni oldindan band qiling</Text>
          </View>
        ) : (
          filtered.map(b => {
            const sc = STATUS_CONF[b.status] || STATUS_CONF.pending;
            const startDate = new Date(b.start_date).toLocaleDateString("uz-UZ");
            const endDate = new Date(b.end_date).toLocaleDateString("uz-UZ");
            return (
              <View key={b.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.toolName, { color: C.text }]}>{b.tool_name}</Text>
                    <Text style={[styles.dates, { color: C.tabIconDefault }]}>{startDate} — {endDate} ({b.days_count} kun)</Text>
                    {b.notes && <Text style={[styles.notes, { color: C.tabIconDefault }]}>"{b.notes}"</Text>}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  <Text style={[styles.amount, { color: C.tint }]}>{formatCurrency(b.total_amount)}</Text>
                  {(b.status === "pending" || b.status === "confirmed") && (
                    <TouchableOpacity onPress={() => handleCancel(b.id)} style={[styles.cancelBtn, { borderColor: "#DC2626" }]}>
                      <Text style={styles.cancelText}>Bekor qilish</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontWeight: "800", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  filterRow: { flexGrow: 0, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "transparent", borderWidth: 1, borderColor: "transparent" },
  filterText: { fontSize: 13, fontWeight: "600" },
  skeleton: { height: 96, borderRadius: 16 },
  empty: { alignItems: "center", paddingVertical: 64 },
  emptyTitle: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  emptyText: { fontSize: 14 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1 },
  cardHeader: { flexDirection: "row", gap: 12, marginBottom: 12 },
  toolName: { fontSize: 16, fontWeight: "700", marginBottom: 3 },
  dates: { fontSize: 13, marginBottom: 2 },
  notes: { fontSize: 12, fontStyle: "italic" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: "flex-start" },
  statusText: { fontSize: 12, fontWeight: "600" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 18, fontWeight: "800" },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  cancelText: { color: "#DC2626", fontSize: 13, fontWeight: "600" },
});
