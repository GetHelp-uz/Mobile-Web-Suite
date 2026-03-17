import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { checkBiometricAvailability } from "@/lib/biometric";
import Colors from "@/constants/colors";
const C = Colors.light;

export function BiometricLockScreen() {
  const { unlockWithBiometric, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bioLabel, setBioLabel] = useState("Biometrik");
  const [bioIcon, setBioIcon] = useState<"finger-print" | "eye">("finger-print");

  useEffect(() => {
    checkBiometricAvailability().then((info) => {
      if (info.type === "facial") {
        setBioLabel("Face ID");
        setBioIcon("eye");
      } else {
        setBioLabel("Barmoq izi");
        setBioIcon("finger-print");
      }
    });
    // Avtomatik biometrik taklifi
    handleUnlock();
  }, []);

  async function handleUnlock() {
    setLoading(true);
    setError(null);
    try {
      const ok = await unlockWithBiometric();
      if (!ok) {
        setError("Autentifikatsiya muvaffaqiyatsiz. Qayta urining.");
      }
    } catch {
      setError("Xatolik yuz berdi. Qayta urining.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Ionicons name="shield-checkmark" size={64} color={C.primary} />
        <Text style={styles.appName}>GetHelp.uz</Text>
        <Text style={styles.subtitle}>Ilovangiz qulflangan</Text>
      </View>

      <View style={styles.actionBox}>
        {loading ? (
          <ActivityIndicator size="large" color={C.primary} />
        ) : (
          <TouchableOpacity style={styles.unlockBtn} onPress={handleUnlock} activeOpacity={0.8}>
            <Ionicons name={bioIcon} size={32} color="#fff" />
            <Text style={styles.unlockText}>{bioLabel} bilan kirish</Text>
          </TouchableOpacity>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Tizimdan chiqish</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  logoBox: {
    alignItems: "center",
    gap: 12,
  },
  appName: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: 4,
  },
  actionBox: {
    alignItems: "center",
    gap: 16,
    width: "100%",
  },
  unlockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
  },
  unlockText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  errorText: {
    color: C.danger,
    fontSize: 14,
    textAlign: "center",
  },
  logoutBtn: {
    paddingVertical: 12,
  },
  logoutText: {
    color: C.textMuted,
    fontSize: 15,
    textDecorationLine: "underline",
  },
});
