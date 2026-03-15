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
  { key: "returned", label: "Qaytarilgan" },
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uz-UZ", { day: "2-digit", month: "short", year: "numeric" });
}

function MyRentalCard({ rental }: { rental: Rental }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  const daysLeft = Math.ceil((new Date(rental.dueDate).getTime() - Date.now()) / 86400000);
  const isOverdue = rental.status === "active" && daysLeft < 0;

  const statusColor = {
    active: Colors.light.success,
    overdue: Colors.light.danger,
    returned: Colors.light.textSecondary,
  }[rental.status as keyof object] || Colors.light.textMuted;

  const statusLabel = {
    active: isOverdue ? "Muddati o'tgan" : "Faol",
    returned: "Qaytarilgan",
  }[rental.status as keyof object] || rental.status;

  return (
    <View style={[styles.card, { backgroundColor: C.surface, borderColor: isOverdue ? "#FCA5A540" : C.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.toolIconBox, { backgroundColor: C.surfaceSecondary }]}>
          <Feather name="tool" size={22} color={C.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.toolName, { color: C.text }]} numberOfLines={2}>
            {rental.toolName || `Asbob #${rental.toolId}`}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: isOverdue ? Colors.light.danger : statusColor }]} />
            <Text style={[styles.statusText, { color: isOverdue ? Colors.light.danger : statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.amount, { color: C.primary }]}>{formatPrice(rental.totalAmount)}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: C.border }]} />

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color={C.textMuted} />
          <Text style={[styles.detailText, { color: C.textSecondary }]}>
            {formatDate(rental.startedAt)} — {formatDate(rental.dueDate)}
          </Text>
        </View>

        {rental.status === "active" && (
          <View style={styles.detailRow}>
            <Ionicons
              name={daysLeft >= 0 ? "time-outline" : "warning-outline"}
              size={14}
              color={daysLeft < 0 ? Colors.light.danger : Colors.light.warning}
            />
            <Text style={[styles.detailText, { color: daysLeft < 0 ? Colors.light.danger : Colors.light.warning }]}>
              {daysLeft >= 0 ? `${daysLeft} kun qoldi` : `${Math.abs(daysLeft)} kun kechikmoqda`}
            </Text>
          </View>
        )}

        {rental.returnedAt && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={14} color={Colors.light.success} />
            <Text style={[styles.detailText, { color: Colors.light.success }]}>
              Qaytarildi: {formatDate(rental.returnedAt)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.priceBreakdown}>
        <Text style={[styles.priceItem, { color: C.textMuted }]}>
          Ijara narxi: {formatPrice(rental.rentalPrice)}
        </Text>
        <Text style={[styles.priceItem, { color: C.textMuted }]}>
          Depozit: {formatPrice(rental.depositAmount)}
        </Text>
        {rental.damageCost && rental.damageCost > 0 ? (
          <Text style={[styles.priceItem, { color: Colors.light.danger }]}>
            Shikast: {formatPrice(rental.damageCost)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function MyRentalsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-rentals", statusFilter, user?.id],
    queryFn: () => api.rentals.list({ customerId: user?.id, status: statusFilter }),
  });

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: C.text }]}>Mening ijaralari</Text>
      </View>

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
          <Feather name="package" size={52} color={C.textMuted} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>Ijara yo'q</Text>
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Hali ijara olmadingiz</Text>
        </View>
      ) : (
        <FlatList
          data={data?.rentals}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => <MyRentalCard rental={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  tabBar: { flexDirection: "row", marginHorizontal: 20, marginBottom: 14, borderRadius: 13, padding: 4 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: "center" },
  tabText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  toolIconBox: { width: 46, height: 46, borderRadius: 13, justifyContent: "center", alignItems: "center" },
  toolName: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  amount: { fontSize: 18, fontFamily: "Inter_700Bold" },
  divider: { height: 1, marginBottom: 10 },
  details: { gap: 6, marginBottom: 10 },
  detailRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  detailText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  priceBreakdown: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priceItem: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
