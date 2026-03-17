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

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Orqaga tugma */}
          <Pressable
            style={styles.backBtn}
            onPress={() => router.replace("/onboarding")}
          >
            <Ionicons name="chevron-back" size={22} color={C.textSecondary} />
            <Text style={[styles.backText, { color: C.textSecondary }]}>Orqaga</Text>
          </Pressable>

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

          {/* Kirish forma */}
          <View style={[styles.formCard, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.formTitle, { color: C.text }]}>Hisobingizga kiring</Text>
            <Text style={[styles.formSubtitle, { color: C.textSecondary }]}>
              Telefon raqam va parolingizni kiriting
            </Text>

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
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShowPassword(v => !v)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={C.textMuted}
                  />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.loginBtn,
                { backgroundColor: C.primary, opacity: pressed || loading ? 0.85 : 1 },
              ]}
              onPress={handleLogin}
              disabled={loading}
            >
              <Ionicons name="log-in-outline" size={20} color="#fff" />
              <Text style={styles.loginBtnText}>
                {loading ? "Kirish..." : "Kirish"}
              </Text>
            </Pressable>
          </View>

          {/* Ro'yhatdan o'tish */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: C.textSecondary }]}>
              Hisobingiz yo'qmi?
            </Text>
            <Pressable onPress={() => router.push("/auth/register")}>
              <Text style={[styles.registerLink, { color: C.primary }]}>
                {"  "}Ro'yhatdan o'tish
              </Text>
            </Pressable>
          </View>

          {/* Xavfsizlik eslatmasi */}
          <View style={[styles.secureNote, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#12B76A" />
            <Text style={[styles.secureText, { color: C.textSecondary }]}>
              Barcha ma'lumotlaringiz xavfsiz va shifrlangan holda saqlanadi
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingHorizontal: 20, paddingTop: 16 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  brand: { alignItems: "center", marginBottom: 32 },
  logoBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#1A6FDB",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  brandName: { fontSize: 30, fontFamily: "Inter_700Bold", marginBottom: 4 },
  brandTagline: { fontSize: 14, fontFamily: "Inter_400Regular" },
  formCard: {
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    marginBottom: 20,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 4 },
  formSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 16 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 6,
  },
  loginBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  registerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  registerLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  secureNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  secureText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
