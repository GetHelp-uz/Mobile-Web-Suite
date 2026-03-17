import { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Share, TextInput, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import * as Clipboard from "expo-clipboard";
import Colors from "@/constants/colors";
import { api } from "@/lib/api";

function formatCurrency(n: number) {
  return n.toLocaleString("uz-UZ") + " so'm";
}

export default function ReferralScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [applyCode, setApplyCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    try {
      const [myD, lbD] = await Promise.all([api.referrals.my(), api.referrals.leaderboard()]);
      setData(myD);
      setLeaderboard(lbD.leaderboard || []);
    } catch { } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const copyCode = async () => {
    if (!data?.referralCode) return;
    await Clipboard.setStringAsync(data.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareCode = async () => {
    await Share.share({
      message: `GetHelp.uz — qurilish asboblari ijarasi! Ro'yxatdan o'ting va kodimdan foydalaning: ${data?.referralCode}. Ikkovimiz ham 20,000 so'm bonus olamiz!`,
    });
  };

  const handleApply = async () => {
    if (!applyCode.trim()) return;
    try {
      const d = await api.referrals.apply(applyCode.trim());
      Alert.alert("Muvaffaqiyatli!", d.message);
      setApplyCode("");
      load();
    } catch (err: any) {
      Alert.alert("Xatolik", err.message);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: C.background, paddingTop: insets.top }]}>
        <View style={[styles.skeleton, { backgroundColor: C.surface }]}/>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: C.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }}/>}>

      {/* Banner */}
      <View style={[styles.banner, { marginHorizontal: 16 }]}>
        <View style={styles.bannerTop}>
          <View style={styles.giftIcon}>
            <Ionicons name="gift-outline" size={28} color="#fff"/>
          </View>
          <Text style={styles.bannerSubtitle}>Sizning referal kodingiz</Text>
        </View>
        <Text style={styles.codeText}>{data?.referralCode || "—"}</Text>
        <View style={styles.bannerBtns}>
          <TouchableOpacity onPress={copyCode} style={styles.bannerBtn}>
            <Ionicons name={copied ? "checkmark-outline" : "copy-outline"} size={18} color="#fff"/>
            <Text style={styles.bannerBtnText}>{copied ? "Nusxalandi!" : "Nusxalash"}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareCode} style={[styles.bannerBtn, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
            <Feather name="share-2" size={18} color="#fff"/>
            <Text style={styles.bannerBtnText}>Ulashish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 12, marginHorizontal: 16, marginTop: 16 }}>
        <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="people-outline" size={24} color="#7C3AED" style={{ marginBottom: 6 }}/>
          <Text style={[styles.statNum, { color: C.text }]}>{data?.rewards?.length || 0}</Text>
          <Text style={[styles.statLabel, { color: C.tabIconDefault }]}>Taklif qilindi</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="trending-up-outline" size={24} color="#059669" style={{ marginBottom: 6 }}/>
          <Text style={[styles.statNum, { color: C.text }]}>{formatCurrency(data?.totalEarned || 0)}</Text>
          <Text style={[styles.statLabel, { color: C.tabIconDefault }]}>Jami bonus</Text>
        </View>
      </View>

      {/* Kod qo'llash */}
      <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border, marginHorizontal: 16, marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Referal kod qo'llash</Text>
        <Text style={[styles.sectionDesc, { color: C.tabIconDefault }]}>Kimdir sizni taklif qilgan bo'lsa, uning kodini kiriting:</Text>
        <View style={styles.applyRow}>
          <TextInput
            style={[styles.codeInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
            value={applyCode} onChangeText={setApplyCode}
            placeholder="Masalan: ab12cd34" placeholderTextColor={C.tabIconDefault}
            autoCapitalize="none" autoCorrect={false}
          />
          <TouchableOpacity onPress={handleApply} disabled={!applyCode.trim()}
            style={[styles.applyBtn, { backgroundColor: applyCode.trim() ? C.tint : C.surface }]}>
            <Text style={[styles.applyBtnText, { color: applyCode.trim() ? "#fff" : C.tabIconDefault }]}>Qo'llash</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Taklif tarixi */}
      {data?.rewards?.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 10 }]}>Taklif tarixi</Text>
          {data.rewards.map((r: any) => (
            <View key={r.id} style={[styles.rewardItem, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rewardName, { color: C.text }]}>{r.referred_name}</Text>
                <Text style={[styles.rewardDate, { color: C.tabIconDefault }]}>{new Date(r.created_at).toLocaleDateString("uz-UZ")}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <View style={[styles.statusDot, { backgroundColor: r.status === "paid" ? "#D1FAE5" : "#FEF3C7" }]}>
                  <Text style={{ fontSize: 11, fontWeight: "600", color: r.status === "paid" ? "#059669" : "#D97706" }}>
                    {r.status === "paid" ? "To'landi" : "Kutilmoqda"}
                  </Text>
                </View>
                <Text style={[styles.rewardAmount, { color: C.tint }]}>{formatCurrency(r.amount)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <View style={{ marginHorizontal: 16, marginTop: 20 }}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 10 }]}>Top referralchilar</Text>
          {leaderboard.slice(0, 5).map((l, idx) => (
            <View key={l.id} style={[styles.leaderItem, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.rankBadge, { backgroundColor: idx === 0 ? "#FEF3C7" : idx === 1 ? "#F3F4F6" : idx === 2 ? "#FEE8D5" : C.surface }]}>
                <Text style={[styles.rankText, { color: idx === 0 ? "#D97706" : idx === 1 ? "#374151" : idx === 2 ? "#C2410C" : C.tabIconDefault }]}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leaderName, { color: C.text }]}>{l.name}</Text>
                <Text style={[styles.leaderCode, { color: C.tabIconDefault }]}>{l.referral_code}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[styles.leaderCount, { color: C.text }]}>{l.total_referrals} kishi</Text>
                <Text style={[styles.leaderEarned, { color: "#059669" }]}>{formatCurrency(l.total_earned)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  skeleton: { height: 200, borderRadius: 20, margin: 16 },
  banner: {
    borderRadius: 20,
    padding: 24,
    background: "#4F46E5",
    backgroundColor: "#4F46E5",
    overflow: "hidden",
  },
  bannerTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  giftIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  bannerSubtitle: { color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: "500" },
  codeText: { fontSize: 36, fontWeight: "900", color: "#fff", letterSpacing: 8, textAlign: "center", marginBottom: 20 },
  bannerBtns: { flexDirection: "row", gap: 10 },
  bannerBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingVertical: 10 },
  bannerBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center" },
  statNum: { fontSize: 20, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 12 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  sectionDesc: { fontSize: 13, marginBottom: 14 },
  applyRow: { flexDirection: "row", gap: 10 },
  codeInput: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, fontFamily: "monospace" },
  applyBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  applyBtnText: { fontWeight: "700", fontSize: 15 },
  rewardItem: { flexDirection: "row", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "center" },
  rewardName: { fontSize: 15, fontWeight: "600" },
  rewardDate: { fontSize: 12, marginTop: 2 },
  rewardAmount: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  statusDot: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  leaderItem: { flexDirection: "row", padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, alignItems: "center", gap: 12 },
  rankBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 14, fontWeight: "800" },
  leaderName: { fontSize: 15, fontWeight: "600" },
  leaderCode: { fontSize: 12, fontFamily: "monospace" },
  leaderCount: { fontSize: 14, fontWeight: "700" },
  leaderEarned: { fontSize: 12, fontWeight: "600" },
});
