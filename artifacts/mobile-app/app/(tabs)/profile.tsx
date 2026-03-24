import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { checkBiometricAvailability } from "@/lib/biometric";
import { hasAppPin, isBiometricEnabled, setBiometricEnabled } from "@/lib/secure-storage";

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Barmoq izi");
  const [bioIcon, setBioIcon] = useState<"finger-print-outline" | "eye-outline">("finger-print-outline");
  const [pinSet, setPinSet] = useState(false);

  // PIN ekranidan qaytganda yangilash
  useFocusEffect(useCallback(() => {
    loadSecurity();
  }, []));

  async function loadSecurity() {
    const [info, pinExists] = await Promise.all([
      checkBiometricAvailability(),
      hasAppPin(),
    ]);
    setBiometricAvailable(info.available);
    setBioIcon(info.type === "facial" ? "eye-outline" : "finger-print-outline");
    if (info.available) {
      setBioLabel(info.label);
      const enabled = await isBiometricEnabled();
      setBioEnabled(enabled);
    }
    setPinSet(pinExists);
  }

  async function handleBiometricToggle(value: boolean) {
    await setBiometricEnabled(value);
    setBioEnabled(value);
    if (value) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

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

      {/* Do'kon egasi menyu */}
      {(user.role === "super_admin" || user.role === "shop_owner") && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Asosiy boshqaruv</Text>
            <MenuItem icon="analytics-outline" label="Dashboard" onPress={() => router.push("/(tabs)")} />
            <MenuItem icon="construct-outline" label="Asboblar" onPress={() => router.push("/(tabs)/tools")} />
            <MenuItem icon="document-text-outline" label="Ijaralar" onPress={() => router.push("/(tabs)/rentals")} />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Do'kon sozlamalari</Text>
            <MenuItem icon="business-outline" label="Filiallar" onPress={() => router.push("/(tabs)/branches")} />
            <MenuItem icon="navigate-outline" label="GPS Monitoring" onPress={() => router.push("/(tabs)/gps-tracking")} />
            <MenuItem icon="pricetag-outline" label="Narxlash" onPress={() => router.push("/(tabs)/pricing")} />
            <MenuItem icon="car-outline" label="Yetkazib berish" onPress={() => router.push("/(tabs)/delivery")} />
            <MenuItem icon="storefront-outline" label="Ta'minotchilar" onPress={() => router.push("/(tabs)/shop-suppliers")} />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Operatsiyalar</Text>
            <MenuItem icon="cube-outline" label="Inventarizatsiya" onPress={() => router.push("/(tabs)/inventory")} />
            <MenuItem icon="construct-outline" label="Ta'mirlash" onPress={() => router.push("/(tabs)/shop-maintenance")} />
            <MenuItem icon="warning-outline" label="Zararlar hisoboti" onPress={() => router.push("/(tabs)/damage-reports")} />
            <MenuItem icon="clipboard-outline" label="Xodimlar topshiriqlari" onPress={() => router.push("/(tabs)/shop-worker-tasks")} />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Marketing</Text>
            <MenuItem icon="ticket-outline" label="Promo kodlar" onPress={() => router.push("/(tabs)/promo-codes")} />
            <MenuItem icon="chatbubbles-outline" label="SMS Markaz" onPress={() => router.push("/(tabs)/sms-center")} />
            <MenuItem icon="star-outline" label="Baholar va sharhlar" onPress={() => router.push("/(tabs)/shop-ratings")} />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Hujjatlar</Text>
            <MenuItem icon="folder-outline" label="Hujjatlar" onPress={() => router.push("/(tabs)/documents")} />
          </View>
        </>
      )}

      {/* Ishchi menyu */}
      {user.role === "worker" && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Tezkor havolalar</Text>
          <MenuItem icon="qr-code-outline" label="QR Skaner" onPress={() => router.push("/(tabs)/scanner")} />
          <MenuItem icon="list-outline" label="Faol ijaralar" onPress={() => router.push("/(tabs)")} />
          <MenuItem icon="clipboard-outline" label="Mening topshiriqlarim" onPress={() => router.push("/(tabs)/shop-worker-tasks")} />
        </View>
      )}

      {/* Mijoz menyu */}
      {user.role === "customer" && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Mening sahifam</Text>
            <MenuItem icon="cube-outline" label="Asboblar" onPress={() => router.push("/(tabs)")} />
            <MenuItem icon="receipt-outline" label="Mening ijaralarim" onPress={() => router.push("/(tabs)/my-rentals")} />
            <MenuItem icon="heart-outline" label="Sevimlilar" onPress={() => router.push("/(tabs)/favorites")} />
            <MenuItem icon="folder-outline" label="Loyihalarim" onPress={() => router.push("/(tabs)/projects")} />
            <MenuItem icon="card-outline" label="Obunalar" onPress={() => router.push("/(tabs)/subscriptions")} />
          </View>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Qo'shimcha xizmatlar</Text>
            <MenuItem icon="calculator-outline" label="Loyiha kalkulyator" onPress={() => router.push("/(tabs)/calculator")} />
            <MenuItem icon="shield-outline" label="Sug'urta" onPress={() => router.push("/(tabs)/insurance")} />
            <MenuItem icon="swap-horizontal-outline" label="Peer Ijaralar" onPress={() => router.push("/(tabs)/peer-listings")} />
            <MenuItem icon="business-outline" label="B2B Portal" onPress={() => router.push("/(tabs)/b2b")} />
            <MenuItem icon="hammer-outline" label="Usta paketlari" onPress={() => router.push("/(tabs)/worker-packages")} />
            <MenuItem icon="document-text-outline" label="Elektron imzo" onPress={() => router.push("/(tabs)/e-sign")} />
          </View>
        </>
      )}

      {/* Xavfsizlik sozlamalari */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Xavfsizlik</Text>

        {/* Ilova PIN */}
        <MenuItem
          icon="keypad-outline"
          label={pinSet ? "Ilova parolini o'zgartirish" : "Ilova paroli o'rnatish"}
          value={pinSet ? "Yoqilgan" : "O'chirilgan"}
          onPress={() => router.push(`/security/set-pin?mode=${pinSet ? "change" : "set"}` as any)}
        />
        {pinSet && (
          <MenuItem
            icon="trash-outline"
            label="Ilova parolini o'chirish"
            onPress={() => router.push("/security/set-pin?mode=remove" as any)}
            danger
          />
        )}

        {/* Biometrik */}
        {biometricAvailable && (
          <View style={[styles.menuItem, { backgroundColor: C.surface, borderColor: C.border }]}>
            <View style={[styles.menuIcon, { backgroundColor: C.primary + "20" }]}>
              <Ionicons name={bioIcon} size={20} color={C.primary} />
            </View>
            <Text style={[styles.menuLabel, { color: C.text }]}>{bioLabel} bilan kirish</Text>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: C.border, true: C.primary + "80" }}
              thumbColor={biometricEnabled ? C.primary : C.textMuted}
            />
          </View>
        )}
      </View>

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
