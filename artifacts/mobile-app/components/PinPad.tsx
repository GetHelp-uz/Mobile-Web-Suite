import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

interface PinPadProps {
  pin: string;
  maxLength?: number;
  onDigit: (d: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  bioIcon?: "finger-print" | "eye";
  disabled?: boolean;
  error?: string | null;
}

export function PinDots({ pin, maxLength = 4, shake }: { pin: string; maxLength?: number; shake?: boolean }) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  return (
    <View style={dots.row}>
      {Array.from({ length: maxLength }).map((_, i) => (
        <View
          key={i}
          style={[
            dots.dot,
            {
              backgroundColor: i < pin.length ? C.primary : "transparent",
              borderColor: i < pin.length ? C.primary : C.border,
            },
          ]}
        />
      ))}
    </View>
  );
}

const dots = StyleSheet.create({
  row: { flexDirection: "row", gap: 18, marginVertical: 24, justifyContent: "center" },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
});

export function PinPad({
  pin, maxLength = 4, onDigit, onDelete, onBiometric, bioIcon = "finger-print", disabled, error,
}: PinPadProps) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;

  function handleDigit(d: string) {
    if (disabled || pin.length >= maxLength) return;
    onDigit(d);
  }

  function handleDelete() {
    if (disabled) return;
    onDelete();
  }

  const keys = ["1","2","3","4","5","6","7","8","9"];

  return (
    <View style={pad.container}>
      {/* Raqamlar */}
      {keys.map((k) => (
        <TouchableOpacity
          key={k}
          style={[pad.key, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={() => handleDigit(k)}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Text style={[pad.keyText, { color: C.text }]}>{k}</Text>
        </TouchableOpacity>
      ))}

      {/* Pastki qator: biometrik | 0 | o'chirish */}
      {onBiometric ? (
        <TouchableOpacity
          style={[pad.key, { backgroundColor: C.surface, borderColor: C.border }]}
          onPress={onBiometric}
          activeOpacity={0.7}
          disabled={disabled}
        >
          <Ionicons name={bioIcon} size={24} color={C.primary} />
        </TouchableOpacity>
      ) : (
        <View style={[pad.key, { backgroundColor: "transparent", borderColor: "transparent" }]} />
      )}

      <TouchableOpacity
        style={[pad.key, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={() => handleDigit("0")}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Text style={[pad.keyText, { color: C.text }]}>0</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[pad.key, { backgroundColor: C.surface, borderColor: C.border }]}
        onPress={handleDelete}
        activeOpacity={0.7}
        disabled={disabled}
      >
        <Ionicons name="backspace-outline" size={24} color={C.text} />
      </TouchableOpacity>
    </View>
  );
}

const pad = StyleSheet.create({
  container: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  key: {
    width: 88,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 26,
    fontFamily: "Inter_500Medium",
  },
});
