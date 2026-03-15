import { Feather, Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Rental } from "@/lib/api";

const STATUS_TABS = [
  { key: undefined, label: "Barchasi" },
  { key: "active", label: "Faol" },
  { key: "overdue", label: "Muddati o'tgan" },
  { key: "returned", label: "Qaytarilgan" },
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

function StatusDot({ status }: { status: string }) {
  const color = { active: "#22C55E", overdue: "#EF4444", returned: "#64748B" }[status as keyof object] || "#94A3B8";
  const label = { active: "Faol", overdue: "Muddati o'tgan", returned: "Qaytarilgan" }[status as keyof object] || status;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color }}>{label}</Text>
    </View>
  );
}

function RentalCard({ rental }: { rental: Rental }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  const daysLeft = Math.ceil((new Date(rental.dueDate).getTime() - Date.now()) / 86400000);
  const isOverdue = rental.status === "overdue" || (rental.status === "active" && daysLeft < 0);

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: isOverdue ? Colors.light.danger + "40" : C.border }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTool, { color: C.text }]} numberOfLines={1}>
            {rental.toolName || `Asbob #${rental.toolId}`}
          </Text>
          <Text style={[styles.cardCustomer, { color: C.textSecondary }]}>
            {rental.customerName || `Mijoz #${rental.customerId}`}
          </Text>
        </View>
        <StatusDot status={rental.status} />
      </View>

      <View style={[styles.cardDivider, { backgroundColor: C.border }]} />

      <View style={styles.cardInfo}>
        <View style={styles.infoItem}>
          <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
          <Text style={[styles.infoText, { color: C.textSecondary }]}>Boshlangan: {formatDate(rental.startedAt)}</Text>
        </View>
        <View style={styles.infoItem}>
          <Ionicons name={isOverdue ? "warning-outline" : "time-outline"} size={14} color={isOverdue ? Colors.light.danger : C.textMuted} />
          <Text style={[styles.infoText, { color: isOverdue ? Colors.light.danger : C.textSecondary }]}>
            Muddat: {formatDate(rental.dueDate)}
            {rental.status === "active" && daysLeft >= 0 ? ` (${daysLeft} kun qoldi)` : ""}
            {isOverdue && rental.status !== "returned" ? ` (${Math.abs(daysLeft)} kun o'tgan)` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View>
          <Text style={[styles.amountLabel, { color: C.textMuted }]}>Jami</Text>
          <Text style={[styles.amount, { color: C.primary }]}>{formatPrice(rental.totalAmount)}</Text>
        </View>
        {rental.damageCost && rental.damageCost > 0 ? (
          <View style={[styles.damageBadge, { backgroundColor: "#FEE2E2" }]}>
            <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
            <Text style={[styles.damageText, { color: "#DC2626" }]}>Shikast: {formatPrice(rental.damageCost)}</Text>
          </View>
        ) : null}
        {rental.returnedAt && (
          <View style={styles.infoItem}>
            <Feather name="check-circle" size={14} color={Colors.light.success} />
            <Text style={[styles.infoText, { color: Colors.light.success }]}>{formatDate(rental.returnedAt)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function RentalsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const shopId = user?.role === "shop_owner" ? user.shopId : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["rentals-admin", statusFilter, shopId],
    queryFn: () => api.rentals.list({ status: statusFilter, shopId }),
  });

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: C.text }]}>Ijaralar</Text>
        <Text style={[styles.count, { color: C.textMuted }]}>{data?.total || 0} ta</Text>
      </View>

      {/* Status tabs */}
      <View style={[styles.tabBar, { backgroundColor: C.surfaceSecondary }]}>
        {STATUS_TABS.map(tab => (
          <Pressable
            key={String(tab.key)}
            style={[styles.tabItem, statusFilter === tab.key && { backgroundColor: C.surface, borderRadius: 10 }]}
            onPress={() => setStatusFilter(tab.key)}
          >
            <Text style={[styles.tabText, { color: statusFilter === tab.key ? C.text : C.textMuted, fontFamily: statusFilter === tab.key ? "Inter_700Bold" : "Inter_400Regular" }]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : (data?.rentals?.length ?? 0) === 0 ? (
        <View style={styles.empty}>
          <Feather name="inbox" size={48} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Ijara topilmadi</Text>
        </View>
      ) : (
        <FlatList
          data={data?.rentals}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => <RentalCard rental={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  count: { fontSize: 14, fontFamily: "Inter_400Regular", paddingBottom: 4 },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 14, borderRadius: 13, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { fontSize: 12 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  cardTool: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3 },
  cardCustomer: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardDivider: { height: 1, marginBottom: 10 },
  cardInfo: { gap: 6, marginBottom: 12 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  amountLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  amount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  damageBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  damageText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
