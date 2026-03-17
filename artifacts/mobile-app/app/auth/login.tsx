import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type QuickRole = "customer" | "shop_owner";

const QUICK_LOGINS: { role: QuickRole; label: string; phone: string; icon: string; color: string }[] = [
  { role: "customer", label: "Mijoz sifatida kirish", phone: "998903333333", icon: "person-outline", color: "#1A6FDB" },
  { role: "shop_owner", label: "Do'kon egasi sifatida kirish", phone: "998901111111", icon: "storefront-outline", color: "#FF6B1A" },
];

const DEMO_ACCOUNTS = [
  { label: "Super Admin", phone: "998901234567", icon: "shield-checkmark-outline" },
  { label: "Do'kon Egasi", phone: "998901111111", icon: "storefront-outline" },
  { label: "Ishchi", phone: "998902222222", icon: "construct-outline" },
  { label: "Mijoz", phone: "998903333333", icon: "person-outline" },
];

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(overridePhone?: string, overridePassword?: string) {
    const p = overridePhone ?? phone;
    const pw = overridePassword ?? password;
    if (!p || !pw) {
      Alert.alert("Xato", "Telefon va parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      await login(p, pw);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Kirish muvaffaqiyatsiz", err.message || "Iltimos qaytadan urinib ko'ring");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(demoPhone: string) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleLogin(demoPhone, "password123");
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brend */}
          <View style={styles.brand}>
            <View style={[styles.logoBox, { backgroundColor: C.primary }]}>
              <MaterialCommunityIcons name="toolbox" size={38} color="#fff" />
            </View>
            <Text style={[styles.brandName, { color: C.text }]}>GetHelp.uz</Text>
            <Text style={[styles.brandTagline, { color: C.textSecondary }]}>
              Qurilish asbob-uskunalari ijarasi
            </Text>
          </View>

          {/* Tezkor kirish tugmalar */}
          <Text style={[styles.sectionLabel, { color: C.textSecondary }]}>Tezkor kirish</Text>

          <View style={styles.quickRow}>
            {QUICK_LOGINS.map((item) => (
              <Pressable
                key={item.role}
                style={({ pressed }) => [
                  styles.quickCard,
                  { backgroundColor: item.color, opacity: pressed || loading ? 0.85 : 1 },
                ]}
                onPress={() => quickLogin(item.phone)}
                disabled={loading}
              >
                <View style={[styles.quickIconBox, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <Ionicons name={item.icon as any} size={26} color="#fff" />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
                {loading ? null : (
                  <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginTop: 4 }} />
                )}
              </Pressable>
            ))}
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
            <Text style={[styles.dividerText, { color: C.textMuted }]}>yoki</Text>
            <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
          </View>

          {/* Manual login form — always visible */}
          <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.formTitle, { color: C.text }]}>Kirish</Text>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Telefon raqam</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="call-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="998XXXXXXXXX"
                  placeholderTextColor={C.textMuted}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: C.textSecondary }]}>Parol</Text>
              <View style={[styles.inputRow, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Parolingiz"
                  placeholderTextColor={C.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={() => handleLogin()}
                />
                <Pressable onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, { backgroundColor: C.primary, opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={() => handleLogin()}
              disabled={loading}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>{loading ? "Kirish..." : "Kirish"}</Text>
            </Pressable>
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: C.textSecondary }]}>Hisobingiz yo'qmi?</Text>
            <Pressable onPress={() => router.push("/auth/register")}>
              <Text style={[styles.registerLink, { color: C.primary }]}>  Ro'yhatdan o'tish</Text>
            </Pressable>
          </View>

          {/* Barcha demo hisoblar */}
          <Text style={[styles.sectionLabel, { color: C.textSecondary, marginTop: 8 }]}>Barcha demo hisoblar</Text>
          <View style={[styles.demoList, { backgroundColor: C.surface, borderColor: C.border }]}>
            {DEMO_ACCOUNTS.map((acc, i) => (
              <Pressable
                key={acc.phone}
                style={({ pressed }) => [
                  styles.demoRow,
                  i < DEMO_ACCOUNTS.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.border },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => quickLogin(acc.phone)}
              >
                <View style={[styles.demoIconBox, { backgroundColor: C.surfaceSecondary }]}>
                  <Ionicons name={acc.icon as any} size={18} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.demoName, { color: C.text }]}>{acc.label}</Text>
                  <Text style={[styles.demoPhone, { color: C.textMuted }]}>{acc.phone}</Text>
                </View>
                <Ionicons name="arrow-forward-circle-outline" size={20} color={C.primary} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 84, height: 84, borderRadius: 24,
    justifyContent: "center", alignItems: "center", marginBottom: 14,
    shadowColor: "#1A6FDB", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  brandName: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 4 },
  brandTagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  sectionLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  quickRow: { gap: 12, marginBottom: 24 },
  quickCard: {
    borderRadius: 18, padding: 20, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  quickIconBox: { width: 46, height: 46, borderRadius: 14, justifyContent: "center", alignItems: "center", marginBottom: 4 },
  quickLabel: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  formCard: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 16, gap: 4 },
  formTitle: { fontSize: 18, fontFamily: "Inter_700Bold", marginBottom: 8 },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demoList: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 16 },
  demoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  demoIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  demoName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  demoPhone: { fontSize: 12, fontFamily: "Inter_400Regular" },
  registerRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  registerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  registerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
