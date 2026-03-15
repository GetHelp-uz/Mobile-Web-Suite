import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api, Tool } from "@/lib/api";

const CATEGORIES = ["Barchasi", "Drel", "Bolgarka", "Shurpayor", "Perforator", "Arra", "O'lchov", "Payvandlash", "Silliqlash", "Kompressor", "Narvon"];
const STATUSES = [
  { key: undefined, label: "Barchasi" },
  { key: "available", label: "Bo'sh" },
  { key: "rented", label: "Ijarada" },
  { key: "maintenance", label: "Ta'mirda" },
];

function formatPrice(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    available: { bg: "#DCFCE7", text: "#16A34A", label: "Bo'sh" },
    rented: { bg: "#FEF9C3", text: "#CA8A04", label: "Ijarada" },
    maintenance: { bg: "#FEE2E2", text: "#DC2626", label: "Ta'mirda" },
  }[status as keyof typeof config] || { bg: "#F1F5F9", text: "#64748B", label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

function ToolRow({ tool }: { tool: Tool }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [styles.row, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.9 : 1 }]}
      onPress={() => { router.push({ pathname: "/tool/[id]", params: { id: String(tool.id) } }); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
    >
      <View style={[styles.rowIcon, { backgroundColor: C.surfaceSecondary }]}>
        <MaterialCommunityIcons name="tools" size={22} color={C.primary} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.rowName, { color: C.text }]} numberOfLines={1}>{tool.name}</Text>
        <Text style={[styles.rowCategory, { color: C.textMuted }]}>{tool.category}</Text>
        <Text style={[styles.rowPrice, { color: C.primary }]}>{formatPrice(tool.pricePerDay)}/kun</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 6 }}>
        <StatusBadge status={tool.status} />
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
      </View>
    </Pressable>
  );
}

export default function ToolsScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const shopId = user?.role === "shop_owner" ? user.shopId : undefined;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tools-admin", category, statusFilter, shopId],
    queryFn: () => api.tools.list({ category, status: statusFilter, shopId, limit: 50 }),
  });

  const filtered = data?.tools?.filter(t =>
    search.length === 0 ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={[styles.title, { color: C.text }]}>Asboblar</Text>
        <Text style={[styles.count, { color: C.textMuted }]}>{data?.total || 0} ta</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
        <Ionicons name="search-outline" size={18} color={C.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: C.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Asbob izlash..."
          placeholderTextColor={C.textMuted}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={C.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Status filter */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={STATUSES}
        keyExtractor={i => String(i.key)}
        contentContainerStyle={styles.statusFilters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.filterChip, { backgroundColor: statusFilter === item.key ? C.primary : C.surfaceSecondary, borderColor: statusFilter === item.key ? C.primary : C.border }]}
            onPress={() => { setStatusFilter(item.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.filterChipText, { color: statusFilter === item.key ? "#fff" : C.textSecondary }]}>{item.label}</Text>
          </Pressable>
        )}
      />

      {/* Category filter */}
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={CATEGORIES}
        keyExtractor={i => i}
        contentContainerStyle={styles.catFilters}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.catChip, { borderBottomWidth: (category ?? "Barchasi") === item ? 2 : 0, borderBottomColor: C.primary }]}
            onPress={() => { setCategory(item === "Barchasi" ? undefined : item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Text style={[styles.catChipText, { color: (category ?? "Barchasi") === item ? C.primary : C.textSecondary, fontFamily: (category ?? "Barchasi") === item ? "Inter_700Bold" : "Inter_400Regular" }]}>{item}</Text>
          </Pressable>
        )}
      />

      {isLoading ? (
        <ActivityIndicator color={C.primary} style={{ flex: 1 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="toolbox-outline" size={52} color={C.textMuted} />
          <Text style={[styles.emptyText, { color: C.textMuted }]}>Asbob topilmadi</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 80 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => <ToolRow tool={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 20, marginBottom: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  statusFilters: { paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catFilters: { paddingHorizontal: 16, gap: 4, marginBottom: 10 },
  catChip: { paddingHorizontal: 10, paddingVertical: 8 },
  catChipText: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 14, padding: 14, borderWidth: 1 },
  rowIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  rowName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  rowCategory: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 3 },
  rowPrice: { fontSize: 14, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
