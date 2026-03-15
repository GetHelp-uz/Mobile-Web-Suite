import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Tool } from "@/lib/api";

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function StatusBadge({ status }: { status: string }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const config = {
    available: { bg: "#DCFCE7", text: "#16A34A", label: "Bo'sh" },
    rented: { bg: "#FEF9C3", text: "#CA8A04", label: "Ijarada" },
    maintenance: { bg: "#F1F5F9", text: "#64748B", label: "Ta'mirda" },
  }[status as keyof typeof config] || { bg: C.surfaceSecondary, text: C.textSecondary, label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [styles.toolCard, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.92 : 1 }]}
      onPress={() => router.push({ pathname: "/tool/[id]", params: { id: String(tool.id) } })}
    >
      <View style={styles.toolCardTop}>
        <View style={[styles.toolIcon, { backgroundColor: C.surfaceSecondary }]}>
          <MaterialCommunityIcons name="tools" size={24} color={C.primary} />
        </View>
        <StatusBadge status={tool.status} />
      </View>
      <Text style={[styles.toolName, { color: C.text }]} numberOfLines={2}>{tool.name}</Text>
      <Text style={[styles.toolCategory, { color: C.textMuted }]}>{tool.category}</Text>
      {tool.shopName && (
        <Text style={[styles.toolShop, { color: C.textSecondary }]} numberOfLines={1}>
          <Feather name="map-pin" size={11} /> {tool.shopName}
        </Text>
      )}
      <View style={styles.toolPriceRow}>
        <Text style={[styles.toolPrice, { color: C.primary }]}>{formatPrice(tool.pricePerDay)}</Text>
        <Text style={[styles.toolPriceLabel, { color: C.textMuted }]}>/kun</Text>
      </View>
      <Text style={[styles.toolDeposit, { color: C.textMuted }]}>
        Depozit: {formatPrice(tool.depositAmount)}
      </Text>
    </Pressable>
  );
}

function StatCard({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  return (
    <View style={[styles.statCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: C.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: C.textMuted }]}>{label}</Text>
    </View>
  );
}

// Customer view: browse tools
function CustomerHome() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tools", user?.region],
    queryFn: () => api.tools.list({
      status: "available",
      limit: 20,
      region: user?.region || undefined,
    }),
  });

  const hasRegion = !!user?.region;
  const allTools = data?.tools || [];

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: insets.top + 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
    >
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: C.textSecondary }]}>Xush kelibsiz</Text>
          <Text style={[styles.userName, { color: C.text }]}>{user?.name}</Text>
          {hasRegion && (
            <View style={styles.regionBadge}>
              <Ionicons name="location" size={11} color={C.primary} />
              <Text style={[styles.regionBadgeText, { color: C.primary }]}>
                {user?.district ? `${user.district}, ` : ""}{user?.region}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.avatarBox, { backgroundColor: C.primary }]}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: C.text }]}>
        {hasRegion ? `${user!.region} asboblari` : "Barcha mavjud asboblar"}
      </Text>

      {hasRegion && allTools.length === 0 && !isLoading && (
        <View style={[styles.regionNotice, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
          <Ionicons name="information-circle-outline" size={20} color={C.textSecondary} />
          <Text style={[styles.regionNoticeText, { color: C.textSecondary }]}>
            {user?.region} hududida hozircha bo'sh asbob yo'q. Boshqa hududlardan ham ko'rishingiz mumkin.
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : allTools.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="toolbox-outline" size={48} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Hozircha bo'sh asbob yo'q</Text>
        </View>
      ) : (
        <View style={styles.toolGrid}>
          {allTools.map(tool => <ToolCard key={tool.id} tool={tool} />)}
        </View>
      )}
    </ScrollView>
  );
}

// Admin/ShopOwner dashboard
function AdminHome() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.analytics.dashboard(user?.role === "shop_owner" ? user.shopId : undefined),
  });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: insets.top + 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: C.textSecondary }]}>Dashboard</Text>
          <Text style={[styles.userName, { color: C.text }]}>{user?.name}</Text>
        </View>
        <View style={[styles.avatarBox, { backgroundColor: C.accent }]}>
          <Ionicons name="analytics" size={20} color="#fff" />
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.totalRevCard}>
            <Text style={[styles.totalRevLabel, { color: "rgba(255,255,255,0.8)" }]}>Umumiy daromad</Text>
            <Text style={styles.totalRevAmount}>{formatPrice(data?.totalRevenue || 0)}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: C.text }]}>Statistika</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="construct-outline" value={String(data?.activeRentals || 0)} label="Faol ijaralar" color={Colors.light.primary} />
            <StatCard icon="warning-outline" value={String(data?.overdueRentals || 0)} label="Muddati o'tgan" color={Colors.light.danger} />
            <StatCard icon="cube-outline" value={String(data?.availableTools || 0)} label="Bo'sh asboblar" color={Colors.light.success} />
            <StatCard icon="people-outline" value={String(data?.totalCustomers || 0)} label="Mijozlar" color={Colors.light.accent} />
          </View>
        </>
      )}
    </ScrollView>
  );
}

// Worker: show active rentals
function WorkerHome() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["active-rentals"],
    queryFn: () => api.rentals.list({ status: "active" }),
  });

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80, paddingTop: insets.top + 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.greeting, { color: C.textSecondary }]}>Xush kelibsiz</Text>
          <Text style={[styles.userName, { color: C.text }]}>{user?.name}</Text>
        </View>
        <View style={[styles.avatarBox, { backgroundColor: Colors.light.success }]}>
          <Ionicons name="scan" size={20} color="#fff" />
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.scannerCTA, { backgroundColor: C.primary, opacity: pressed ? 0.9 : 1 }]}
        onPress={() => router.push("/(tabs)/scanner")}
      >
        <Ionicons name="qr-code-outline" size={28} color="#fff" />
        <Text style={styles.scannerCTAText}>QR Kod Skanerlash</Text>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
      </Pressable>

      <Text style={[styles.sectionTitle, { color: C.text }]}>Faol ijaralar ({data?.total || 0})</Text>

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ marginTop: 32 }} />
      ) : data?.rentals?.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={44} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Faol ijara yo'q</Text>
        </View>
      ) : (
        data?.rentals?.map(r => (
          <View key={r.id} style={[styles.rentalRow, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rentalTool, { color: C.text }]}>{r.toolName || `Asbob #${r.toolId}`}</Text>
              <Text style={[styles.rentalCustomer, { color: C.textSecondary }]}>
                {r.customerName || `Mijoz #${r.customerId}`}
              </Text>
              <Text style={[styles.rentalAmount, { color: C.primary }]}>{formatPrice(r.totalAmount)}</Text>
            </View>
            <StatusBadge status={r.status} />
          </View>
        ))
      )}
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "super_admin" || user.role === "shop_owner") return <AdminHome />;
  if (user.role === "worker") return <WorkerHome />;
  return <CustomerHome />;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 24 },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold" },
  avatarBox: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", paddingHorizontal: 20, marginBottom: 14 },
  toolGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12 },
  toolCard: {
    width: "47%", borderRadius: 16, padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  toolCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  toolIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  toolName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 4, lineHeight: 19 },
  toolCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 4 },
  toolShop: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 6 },
  toolPriceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  toolPrice: { fontSize: 15, fontFamily: "Inter_700Bold" },
  toolPriceLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  toolDeposit: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  emptyState: { alignItems: "center", justifyContent: "center", paddingTop: 48, gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  regionBadge: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  regionBadgeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  regionNotice: { marginHorizontal: 20, marginBottom: 16, borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  regionNoticeText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  // Dashboard
  totalRevCard: {
    marginHorizontal: 20, marginBottom: 20, borderRadius: 18, padding: 24,
    backgroundColor: "#1A6FDB",
    shadowColor: "#1A6FDB", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  totalRevLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 6 },
  totalRevAmount: { fontSize: 30, fontFamily: "Inter_700Bold", color: "#fff" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 12, marginBottom: 24 },
  statCard: {
    width: "47%", borderRadius: 14, padding: 16, borderWidth: 1, alignItems: "flex-start",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginBottom: 10 },
  statValue: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  // Worker
  scannerCTA: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 24,
    borderRadius: 16, padding: 18, gap: 12,
  },
  scannerCTAText: { flex: 1, color: "#fff", fontSize: 17, fontFamily: "Inter_600SemiBold" },
  rentalRow: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 20, marginBottom: 10,
    borderRadius: 14, padding: 16, borderWidth: 1,
  },
  rentalTool: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  rentalCustomer: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 3 },
  rentalAmount: { fontSize: 14, fontFamily: "Inter_700Bold" },
});
