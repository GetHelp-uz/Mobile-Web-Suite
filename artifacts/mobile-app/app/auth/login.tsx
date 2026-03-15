import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
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

const DEMO_ACCOUNTS = [
  { label: "Super Admin", phone: "998901234567" },
  { label: "Do'kon Egasi", phone: "998901111111" },
  { label: "Ishchi", phone: "998902222222" },
  { label: "Mijoz", phone: "998903333333" },
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

  async function handleLogin() {
    if (!phone || !password) {
      Alert.alert("Xato", "Telefon va parolni kiriting");
      return;
    }
    setLoading(true);
    try {
      await login(phone, password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Kirish muvaffaqiyatsiz", err.message || "Iltimos qaytadan urinib ko'ring");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(demoPhone: string) {
    setPhone(demoPhone);
    setPassword("password123");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoBox, { backgroundColor: C.primary }]}>
              <Ionicons name="construct" size={36} color="#fff" />
            </View>
            <Text style={[styles.title, { color: C.text }]}>ToolRent</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>
              Asboblar ijarasi platformasi
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.cardTitle, { color: C.text }]}>Kirish</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Telefon raqam</Text>
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
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.textSecondary }]}>Parol</Text>
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
                />
                <Pressable onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.loginBtn, { backgroundColor: C.primary, opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? "Kirish..." : "Kirish"}
              </Text>
            </Pressable>
          </View>

          {/* Demo accounts */}
          <View style={styles.demoSection}>
            <Text style={[styles.demoTitle, { color: C.textSecondary }]}>Demo hisoblar (parol: password123)</Text>
            <View style={styles.demoGrid}>
              {DEMO_ACCOUNTS.map((acc) => (
                <Pressable
                  key={acc.phone}
                  style={({ pressed }) => [
                    styles.demoChip,
                    { backgroundColor: C.surfaceSecondary, borderColor: C.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => fillDemo(acc.phone)}
                >
                  <Text style={[styles.demoChipText, { color: C.primary }]}>{acc.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 24, paddingTop: 32 },
  header: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 80, height: 80, borderRadius: 22,
    justifyContent: "center", alignItems: "center",
    marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular" },
  card: {
    borderRadius: 20, padding: 24, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: "center", marginTop: 8,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  demoSection: { gap: 12 },
  demoTitle: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  demoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  demoChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  demoChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
