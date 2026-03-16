import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  StyleSheet, ActivityIndicator, SafeAreaView, Image
} from "react-native";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  return domain ? `https://${domain}/api` : "";
}

function formatCurrency(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

const ICONS: Record<string, string> = {
  uy_qurish: "🏗️", pol_tashlash: "⬛", gidravlika: "🚿",
  elektrr: "⚡", tomir: "🧱", devor: "🧱", tomchi: "🏠",
  pardozlash: "🎨", yiqitish: "💥", default: "🔧"
};

const HINTS = ["Uy qurmoqchiman", "Vannaxona ta'mirlash", "Pol plitka tashlash", "Elektr o'tkazish"];

export default function AITab() {
  const { user, token } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const baseUrl = getBaseUrl();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [projectTypes, setProjectTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    fetch(`${baseUrl}/ai/categories`, { headers: h })
      .then(r => r.json()).then(d => setProjectTypes(d.projectTypes || []));
  }, []);

  const recommend = async () => {
    if (!selectedType && !description) return;
    setLoading(true);
    try {
      const r = await fetch(`${baseUrl}/ai/recommend`, {
        method: "POST", headers: h,
        body: JSON.stringify({ projectType: selectedType, projectDescription: description, userId: user?.userId }),
      });
      const d = await r.json();
      setResult(d);
      setStep(2);
    } finally { setLoading(false); }
  };

  const reset = () => { setResult(null); setStep(1); setSelectedType(""); setDescription(""); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.aiIconBox}>
            <Text style={{ fontSize: 28 }}>✨</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.title, { color: C.text }]}>AI Tavsiyachi</Text>
            <Text style={[styles.subtitle, { color: C.textSecondary }]}>Loyiha uchun kerakli asboblar</Text>
          </View>
        </View>

        {step === 1 ? (
          <>
            {/* Loyiha turi */}
            <Text style={[styles.sectionTitle, { color: C.text }]}>Loyiha turini tanlang</Text>
            <View style={styles.typesGrid}>
              {projectTypes.map(pt => (
                <TouchableOpacity key={pt.key}
                  style={[styles.typeCard, { backgroundColor: C.surface, borderColor: selectedType === pt.key ? "#f97316" : C.border }]}
                  onPress={() => setSelectedType(pt.key)}>
                  <Text style={{ fontSize: 24 }}>{pt.icon}</Text>
                  <Text style={[styles.typeLabel, { color: C.text }]}>{pt.label}</Text>
                  <Text style={[styles.typeDesc, { color: C.textSecondary }]} numberOfLines={2}>{pt.description}</Text>
                  {selectedType === pt.key && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Batafsil */}
            <Text style={[styles.sectionTitle, { color: C.text }]}>Batafsil tasvirlab bering</Text>
            <TextInput
              style={[styles.descInput, { backgroundColor: C.surface, color: C.text, borderColor: C.border }]}
              placeholder="Masalan: 3 qavatli uy qurmoqchiman..."
              placeholderTextColor={C.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 20 }}>
              {HINTS.map(h => (
                <TouchableOpacity key={h}
                  style={[styles.hintChip, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => setDescription(h)}>
                  <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!selectedType && !description) && { opacity: 0.5 }]}
              onPress={recommend}
              disabled={loading || (!selectedType && !description)}>
              {loading ? <ActivityIndicator color="#fff" /> : (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>✨</Text>
                  <Text style={styles.submitBtnText}>Tavsiya qiling</Text>
                </View>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* AI javobi */}
            <View style={[styles.aiResult, { backgroundColor: isDark ? "#431407" : "#fff7ed", borderColor: "#f97316" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{ICONS[result?.detectedType] || "🔧"}</Text>
                <Text style={[styles.aiResultTitle, { color: "#f97316" }]}>AI tavsiyasi</Text>
              </View>
              <Text style={[styles.aiResultText, { color: C.text }]}>
                {result?.aiMessage?.replace(/\*\*(.*?)\*\*/g, "$1") || ""}
              </Text>
              {result?.recommendedCategories && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {result.recommendedCategories.map((cat: string) => (
                    <View key={cat} style={styles.catBadge}>
                      <Text style={styles.catBadgeText}>{cat}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: C.text }]}>
              Mos asboblar ({result?.tools?.length || 0} ta)
            </Text>

            {result?.tools?.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[{ fontSize: 40, textAlign: "center" }]}>🔍</Text>
                <Text style={[styles.emptyText, { color: C.textSecondary }]}>Mos asboblar topilmadi</Text>
              </View>
            ) : (
              result?.tools?.map((tool: any) => (
                <TouchableOpacity key={tool.id}
                  style={[styles.toolCard, { backgroundColor: C.surface, borderColor: C.border }]}
                  onPress={() => router.push(`/tool/${tool.id}`)}>
                  <View style={styles.toolRow}>
                    <View style={[styles.toolImg, { backgroundColor: C.background }]}>
                      {tool.image_url
                        ? <Image source={{ uri: tool.image_url }} style={{ width: 52, height: 52, borderRadius: 10 }} />
                        : <Text style={{ fontSize: 28 }}>🔧</Text>
                      }
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.toolName, { color: C.text }]} numberOfLines={2}>{tool.name}</Text>
                      <Text style={[styles.toolCategory, { color: C.textSecondary }]}>{tool.category}</Text>
                      {tool.shop_name && <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>{tool.shop_name}</Text>}
                      <Text style={styles.toolPrice}>{formatCurrency(Number(tool.price_per_day))}/kun</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
                  </View>
                </TouchableOpacity>
              ))
            )}

            <TouchableOpacity style={[styles.resetBtn, { borderColor: C.border }]} onPress={reset}>
              <Text style={[styles.resetBtnText, { color: C.textSecondary }]}>Yangi qidirish</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  aiIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#f97316", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 8 },
  typesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  typeCard: { width: "47%", borderRadius: 14, borderWidth: 2, padding: 12, position: "relative" },
  typeLabel: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  typeDesc: { fontSize: 11, marginTop: 3, lineHeight: 16 },
  checkBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "#f97316", borderRadius: 10, width: 18, height: 18, alignItems: "center", justifyContent: "center" },
  descInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
  hintChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  submitBtn: { backgroundColor: "#f97316", borderRadius: 14, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  aiResult: { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 20 },
  aiResultTitle: { fontSize: 14, fontWeight: "700" },
  aiResultText: { fontSize: 14, lineHeight: 22 },
  catBadge: { backgroundColor: "#f97316", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  catBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  toolCard: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  toolRow: { flexDirection: "row", alignItems: "center" },
  toolImg: { width: 56, height: 56, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  toolName: { fontSize: 14, fontWeight: "600" },
  toolCategory: { fontSize: 12, marginTop: 2 },
  toolPrice: { fontSize: 14, fontWeight: "700", color: "#f97316", marginTop: 4 },
  emptyCard: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center" },
  emptyText: { fontSize: 14, marginTop: 8, textAlign: "center" },
  resetBtn: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center", marginTop: 12 },
  resetBtnText: { fontSize: 15, fontWeight: "600" },
});
