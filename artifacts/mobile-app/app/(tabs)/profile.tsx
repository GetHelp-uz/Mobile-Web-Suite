import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  shop_owner: "Do'kon egasi",
  worker: "Ishchi",
  customer: "Mijoz",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "#7C3AED",
  shop_owner: "#FF6B1A",
  worker: "#22C55E",
  customer: "#1A6FDB",
};

function MenuItem({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, { backgroundColor: C.surface, borderColor: C.border, opacity: pressed ? 0.85 : 1 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIcon, { backgroundColor: danger ? "#FEE2E2" : C.surfaceSecondary }]}>
        <Ionicons name={icon as any} size={20} color={danger ? Colors.light.danger : C.primary} />
      </View>
      <Text style={[styles.menuLabel, { color: danger ? Colors.light.danger : C.text }]}>{label}</Text>
      <View style={styles.menuRight}>
        {value ? <Text style={[styles.menuValue, { color: C.textMuted }]}>{value}</Text> : null}
        {onPress && <Feather name="chevron-right" size={16} color={C.textMuted} />}
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  async function handleLogout() {
    Alert.alert("Chiqish", "Haqiqatan ham chiqmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "Chiqish",
        style: "destructive",
        onPress: async () => {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
  }

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] || C.primary;
  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar hero */}
      <View style={[styles.hero, { paddingTop: insets.top + 20 }]}>
        <View style={[styles.avatar, { backgroundColor: roleColor }]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={[styles.heroName, { color: C.text }]}>{user.name}</Text>
        <View style={[styles.rolePill, { backgroundColor: roleColor + "20" }]}>
          <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
          <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
        </View>
        <Text style={[styles.heroPhone, { color: C.textSecondary }]}>{user.phone}</Text>
      </View>

      {/* User info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Hisob ma'lumotlari</Text>
        <MenuItem icon="person-outline" label="Ism" value={user.name} />
        <MenuItem icon="call-outline" label="Telefon" value={user.phone} />
        {user.email && <MenuItem icon="mail-outline" label="Email" value={user.email} />}
        <MenuItem icon="shield-checkmark-outline" label="Rol" value={roleLabel} />
      </View>

      {/* Navigation links based on role */}
      {(user.role === "super_admin" || user.role === "shop_owner") && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Boshqaruv</Text>
          <MenuItem
            icon="analytics-outline"
            label="Dashboard"
            onPress={() => router.push("/(tabs)")}
          />
          <MenuItem
            icon="construct-outline"
            label="Asboblar"
            onPress={() => router.push("/(tabs)/tools")}
          />
          <MenuItem
            icon="document-text-outline"
            label="Ijaralar"
            onPress={() => router.push("/(tabs)/rentals")}
          />
        </View>
      )}

      {user.role === "worker" && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Tezkor havolalar</Text>
          <MenuItem
            icon="qr-code-outline"
            label="QR Skaner"
            onPress={() => router.push("/(tabs)/scanner")}
          />
          <MenuItem
            icon="list-outline"
            label="Faol ijaralar"
            onPress={() => router.push("/(tabs)")}
          />
        </View>
      )}

      {user.role === "customer" && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Tezkor havolalar</Text>
          <MenuItem
            icon="cube-outline"
            label="Asboblar"
            onPress={() => router.push("/(tabs)")}
          />
          <MenuItem
            icon="receipt-outline"
            label="Mening ijaralarim"
            onPress={() => router.push("/(tabs)/my-rentals")}
          />
        </View>
      )}

      {/* App info */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Ilova haqida</Text>
        <MenuItem icon="information-circle-outline" label="Versiya" value="1.0.0" />
        <MenuItem
          icon="globe-outline"
          label="Til"
          value="O'zbek tili"
        />
      </View>

      {/* Logout */}
      <View style={[styles.section, { marginTop: 8 }]}>
        <MenuItem
          icon="log-out-outline"
          label="Chiqish"
          onPress={handleLogout}
          danger
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <MaterialCommunityIcons name="toolbox" size={20} color={C.textMuted} />
        <Text style={[styles.footerText, { color: C.textMuted }]}>GetHelp.uz — Qurilish asbob-uskunalari</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: "center", paddingBottom: 28, paddingHorizontal: 20 },
  avatar: {
    width: 90, height: 90, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  avatarText: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  heroName: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 8 },
  rolePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  roleDot: { width: 8, height: 8, borderRadius: 4 },
  roleText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  heroPhone: { fontSize: 15, fontFamily: "Inter_400Regular" },
  section: { paddingHorizontal: 16, marginBottom: 4 },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 4, marginBottom: 8, marginTop: 12 },
  menuItem: {
    flexDirection: "row", alignItems: "center", borderRadius: 14,
    padding: 14, marginBottom: 6, borderWidth: 1, gap: 12,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuValue: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footer: { alignItems: "center", gap: 6, paddingVertical: 24, flexDirection: "row", justifyContent: "center" },
  footerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
