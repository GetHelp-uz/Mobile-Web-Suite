import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity, RefreshControl, TextInput, Alert
} from "react-native";
import { useColorScheme } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { Ionicons } from "@expo/vector-icons";

function getBaseUrl() {
  const domain = process.env.EXPO_PUBLIC_DOMAIN || "";
  return domain ? `https://${domain}/api` : "";
}

function formatCurrency(n: number) {
  return `${Number(n).toLocaleString()} so'm`;
}

const LEVELS = [
  { name: "bronze", label: "Bronza", minPoints: 0, color: "#CD7F32", icon: "medal-outline" },
  { name: "silver", label: "Kumush", minPoints: 500, color: "#C0C0C0", icon: "medal-outline" },
  { name: "gold", label: "Oltin", minPoints: 2000, color: "#FFD700", icon: "trophy-outline" },
  { name: "platinum", label: "Platina", minPoints: 5000, color: "#8b5cf6", icon: "diamond-outline" },
];

function getLevel(points: number) {
  let level = LEVELS[0];
  for (const l of LEVELS) { if (points >= l.minPoints) level = l; }
  return level;
}

function getNextLevel(level: typeof LEVELS[0]) {
  const idx = LEVELS.findIndex(l => l.name === level.name);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

export default function LoyaltyTab() {
  const { user, token } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const baseUrl = getBaseUrl();
  const h = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [data, setData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [redeemPts, setRedeemPts] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    try {
      const [myR, lbR] = await Promise.all([
        fetch(`${baseUrl}/loyalty/my`, { headers: h }),
        fetch(`${baseUrl}/loyalty/leaderboard`, { headers: h }),
      ]);
      const myD = await myR.json();
      const lbD = await lbR.json();
      setData(myD);
      setLeaderboard(lbD.leaderboard || []);
    } finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, []);
  const onRefresh = () => { setRefreshing(true); load(); };

  const redeem = async () => {
    const pts = Number(redeemPts);
    if (!pts || pts < 50) { Alert.alert("Xato", "Kamida 50 ball kiriting"); return; }
    setRedeeming(true);
    try {
      const r = await fetch(`${baseUrl}/loyalty/redeem`, {
        method: "POST", headers: h, body: JSON.stringify({ points: pts }),
      });
      const d = await r.json();
      if (r.ok) {
        setRedeemPts("");
        Alert.alert("Muvaffaqiyat!", `${pts} ball = ${formatCurrency(d.discountAmount || 0)} chegirma`);
        load();
      } else { Alert.alert("Xato", d.error || "Amalga oshmadi"); }
    } finally { setRedeeming(false); }
  };

  const myPoints = data?.totalPoints || 0;
  const myLevel = getLevel(myPoints);
  const nextLevel = getNextLevel(myLevel);
  const progress = nextLevel ? Math.min(1, (myPoints - myLevel.minPoints) / (nextLevel.minPoints - myLevel.minPoints)) : 1;
  const pointsValue = Math.floor(myPoints * 100);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f97316" />}
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: C.text }]}>Loyallik</Text>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="large" color="#f97316" />
        ) : (
          <>
            {/* Daraja kartasi */}
            <View style={[styles.levelCard, { backgroundColor: myLevel.color + "22", borderColor: myLevel.color + "55" }]}>
              <View style={styles.levelTop}>
                <View style={[styles.levelBadge, { backgroundColor: myLevel.color }]}>
                  <Ionicons name={myLevel.icon as any} size={22} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.levelName, { color: myLevel.color }]}>{myLevel.label}</Text>
                  <Text style={[styles.levelSub, { color: C.textSecondary }]}>Sizning darajangiz</Text>
                </View>
                <View style={{ flex: 1 }} />
                <View style={styles.pointsBox}>
                  <Text style={[styles.pointsBig, { color: myLevel.color }]}>{myPoints.toLocaleString()}</Text>
                  <Text style={[styles.pointsLabel, { color: C.textSecondary }]}>ball</Text>
                </View>
              </View>

              {nextLevel && (
                <>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: C.border }]}>
                      <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: myLevel.color }]} />
                    </View>
                    <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>{Math.round(progress * 100)}%</Text>
                  </View>
                  <Text style={[styles.nextLevelText, { color: C.textSecondary }]}>
                    {nextLevel.label} darajasiga: {(nextLevel.minPoints - myPoints).toLocaleString()} ball qoldi
                  </Text>
                </>
              )}
            </View>

            {/* Statistika */}
            <View style={styles.infoRow}>
              {[
                { label: "Jami to'plangan", value: `${data?.lifetimePoints?.toLocaleString() || 0} ball`, icon: "trophy-outline", color: "#f59e0b" },
                { label: "Ball qiymati", value: formatCurrency(pointsValue), icon: "cash-outline", color: "#22c55e" },
              ].map(item => (
                <View key={item.label} style={[styles.infoCard, { backgroundColor: C.surface, borderColor: C.border }]}>
                  <Ionicons name={item.icon as any} size={22} color={item.color} />
                  <Text style={[styles.infoVal, { color: C.text }]}>{item.value}</Text>
                  <Text style={[styles.infoLabel, { color: C.textSecondary }]}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Balllarni sarflash */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Balllarni sarflash</Text>
              <Text style={[styles.cardSub, { color: C.textSecondary }]}>50+ ball = chegirma (100 ball = 10,000 so'm)</Text>
              <View style={styles.redeemRow}>
                <TextInput
                  style={[styles.redeemInput, { backgroundColor: C.background, color: C.text, borderColor: C.border }]}
                  placeholder="Ball miqdori (min 50)"
                  placeholderTextColor={C.textSecondary}
                  keyboardType="number-pad"
                  value={redeemPts}
                  onChangeText={setRedeemPts}
                />
                <TouchableOpacity
                  style={[styles.redeemBtn, (!redeemPts || redeeming) && { opacity: 0.5 }]}
                  onPress={redeem}
                  disabled={!redeemPts || redeeming}>
                  <Text style={styles.redeemBtnText}>{redeeming ? "..." : "Sarfla"}</Text>
                </TouchableOpacity>
              </View>
              {redeemPts && Number(redeemPts) >= 50 && (
                <Text style={[styles.redeemPreview, { color: "#22c55e" }]}>
                  {Number(redeemPts)} ball = {formatCurrency(Math.floor(Number(redeemPts) * 100))} chegirma
                </Text>
              )}
            </View>

            {/* Darajalar */}
            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              <Text style={[styles.cardTitle, { color: C.text }]}>Darajalar</Text>
              <View style={{ gap: 12 }}>
                {LEVELS.map(level => (
                  <View key={level.name} style={[styles.levelRow, myLevel.name === level.name && { backgroundColor: level.color + "15", borderRadius: 12, padding: 8, margin: -4 }]}>
                    <View style={[styles.levelDot, { backgroundColor: level.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.levelRowName, { color: C.text }]}>{level.label}</Text>
                      <Text style={[{ fontSize: 12 }, { color: C.textSecondary }]}>{level.minPoints.toLocaleString()}+ ball</Text>
                    </View>
                    {myLevel.name === level.name && (
                      <View style={[styles.currentBadge, { backgroundColor: level.color }]}>
                        <Text style={styles.currentBadgeText}>Hozir</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>

            {/* Liderlar jadvali */}
            {leaderboard.length > 0 && (
              <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
                <Text style={[styles.cardTitle, { color: C.text }]}>Eng faol foydalanuvchilar</Text>
                {leaderboard.slice(0, 5).map((lb: any, i: number) => (
                  <View key={lb.userId} style={[styles.lbRow, i < 4 && { borderBottomWidth: 1, borderBottomColor: C.border }]}>
                    <Text style={[styles.lbRank, { color: i < 3 ? "#f59e0b" : C.textSecondary }]}>#{i + 1}</Text>
                    <View style={[styles.lbAvatar, { backgroundColor: "#f97316" + (i < 3 ? "ff" : "44") }]}>
                      <Text style={[styles.lbAvatarText, { color: i < 3 ? "#fff" : "#f97316" }]}>
                        {(lb.name || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.lbName, { color: C.text }]}>{lb.name || "Foydalanuvchi"}</Text>
                    </View>
                    <Text style={[styles.lbPoints, { color: "#f97316" }]}>{lb.totalPoints} ball</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 16 },
  levelCard: { borderRadius: 20, borderWidth: 1.5, padding: 20, marginBottom: 14 },
  levelTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  levelBadge: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  levelName: { fontSize: 18, fontWeight: "800" },
  levelSub: { fontSize: 12 },
  pointsBox: { alignItems: "flex-end" },
  pointsBig: { fontSize: 28, fontWeight: "900" },
  pointsLabel: { fontSize: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  nextLevelText: { fontSize: 12, marginTop: 6 },
  infoRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  infoCard: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  infoVal: { fontSize: 15, fontWeight: "700" },
  infoLabel: { fontSize: 11, textAlign: "center" },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  cardSub: { fontSize: 12, marginBottom: 12 },
  redeemRow: { flexDirection: "row", gap: 10 },
  redeemInput: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 },
  redeemBtn: { backgroundColor: "#f97316", borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  redeemBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  redeemPreview: { fontSize: 13, marginTop: 8, textAlign: "center", fontWeight: "600" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelDot: { width: 12, height: 12, borderRadius: 6 },
  levelRowName: { fontSize: 14, fontWeight: "600" },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  currentBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  lbRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  lbRank: { width: 28, fontSize: 14, fontWeight: "700" },
  lbAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  lbAvatarText: { fontSize: 14, fontWeight: "800" },
  lbName: { fontSize: 14, fontWeight: "600" },
  lbPoints: { fontSize: 13, fontWeight: "700" },
});
