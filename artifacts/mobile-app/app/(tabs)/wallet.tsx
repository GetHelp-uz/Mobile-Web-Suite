import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function fmt(n: number) { return n.toLocaleString("uz-UZ") + " so'm"; }

const PROVIDERS = [
  { id: "click", label: "Click", icon: "card-outline" as const, color: "#1976D2" },
  { id: "payme", label: "Payme", icon: "wallet-outline" as const, color: "#00C853" },
  { id: "paynet", label: "Paynet", icon: "cash-outline" as const, color: "#FF6D00" },
];

const QUICK = [50000, 100000, 200000, 500000, 1000000];

const TX_LABELS: Record<string, string> = {
  topup: "To'ldirish",
  payment: "Ijara to'lovi",
  deposit_hold: "Depozit ushlab qolindi",
  deposit_release: "Depozit qaytarildi",
  deposit_deduct: "Zarar uchun ayirildi",
  refund: "Qaytarib berildi",
  withdrawal: "Yechib olish",
};

type WalletData = { id: number; balance: number; escrow_balance: number; currency: string };
type Tx = { id: number; amount: number; type: string; provider: string; status: string; description: string; balance_after: number; created_at: string };

export default function WalletScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txns, setTxns] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [topupOpen, setTopupOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("click");
  const [topping, setTopping] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.wallet.get();
      if (d.wallet) setWallet(d.wallet);
      if (d.transactions) setTxns(d.transactions);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleTopup = async () => {
    if (!amount || Number(amount) < 1000) {
      Alert.alert("Xatolik", "Minimal miqdor: 1 000 so'm");
      return;
    }
    setTopping(true);
    try {
      const d = await api.wallet.topup(Number(amount), provider);
      setTopupOpen(false);
      Alert.alert(
        "To'lov havolasi tayyor",
        `${provider.toUpperCase()} orqali ${fmt(Number(amount))} to'lash uchun sahifaga o'tasizmi?`,
        [
          { text: "Bekor", style: "cancel" },
          { text: "O'tish", onPress: async () => { if (d.paymentUrl) await Linking.openURL(d.paymentUrl); } },
        ]
      );
      setAmount("");
    } catch (e: any) {
      Alert.alert("Xatolik", e.message);
    } finally { setTopping(false); }
  };

  const isIncome = (type: string) => ["topup", "deposit_release", "refund"].includes(type);

  const TxItem = ({ tx }: { tx: Tx }) => (
    <View style={[styles.txRow, { borderBottomColor: C.border }]}>
      <View style={[styles.txIcon, { backgroundColor: isIncome(tx.type) ? "#E8F5E9" : "#FFEBEE" }]}>
        <Ionicons name={isIncome(tx.type) ? "arrow-down" : "arrow-up"} size={18} color={isIncome(tx.type) ? "#2E7D32" : "#C62828"} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txType, { color: C.text }]}>{TX_LABELS[tx.type] || tx.type}</Text>
        <Text style={[styles.txDesc, { color: C.textSecondary }]}>{tx.provider.toUpperCase()} · {new Date(tx.created_at).toLocaleDateString("uz-UZ")}</Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={[styles.txAmount, { color: isIncome(tx.type) ? "#2E7D32" : "#C62828" }]}>
          {isIncome(tx.type) ? "+" : "-"}{fmt(tx.amount)}
        </Text>
        <Text style={[styles.txBalance, { color: C.textSecondary }]}>{fmt(tx.balance_after)}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: C.background, paddingTop: insets.top }]}>
      <FlatList
        data={txns}
        keyExtractor={t => String(t.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={() => (
          <View>
            {/* Balans card */}
            <View style={[styles.card, { backgroundColor: "#1565C0", margin: 20, borderRadius: 24 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <View style={styles.cardIcon}>
                  <Ionicons name="wallet" size={22} color="#fff" />
                </View>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}>GetHelp.uz Hamyon</Text>
              </View>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 6 }}>Asosiy balans</Text>
              <Text style={styles.balanceText}>{fmt(wallet?.balance || 0)}</Text>
              <View style={styles.cardFooter}>
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Depozit (escrow)</Text>
                  <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{fmt(wallet?.escrow_balance || 0)}</Text>
                </View>
                <View style={styles.cardDivider} />
                <View>
                  <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Umumiy</Text>
                  <Text style={{ color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" }}>{fmt((wallet?.balance || 0) + (wallet?.escrow_balance || 0))}</Text>
                </View>
              </View>
            </View>

            {/* To'ldirish tugmasi */}
            <Pressable style={[styles.topupBtn, { backgroundColor: C.primary }]} onPress={() => setTopupOpen(true)}>
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <Text style={styles.topupBtnText}>Hisobni to'ldirish</Text>
            </Pressable>

            {/* Qisqa statistika */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>Jami kirim</Text>
                <Text style={[styles.statVal, { color: "#2E7D32" }]}>
                  {fmt(txns.filter(t => isIncome(t.type) && t.status === "completed").reduce((s, t) => s + t.amount, 0))}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.statLabel, { color: C.textSecondary }]}>Jami chiqim</Text>
                <Text style={[styles.statVal, { color: "#C62828" }]}>
                  {fmt(txns.filter(t => !isIncome(t.type) && t.status === "completed").reduce((s, t) => s + t.amount, 0))}
                </Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: C.text, marginHorizontal: 20, marginTop: 4, marginBottom: 8 }]}>
              So'nggi tranzaksiyalar
            </Text>
          </View>
        )}
        renderItem={({ item }) => <TxItem tx={item} />}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Ionicons name="wallet-outline" size={64} color={C.border} />
            <Text style={[styles.emptyText, { color: C.textSecondary }]}>Tranzaksiyalar yo'q</Text>
            <Text style={[styles.emptyHint, { color: C.textSecondary }]}>Hisobingizni to'ldiring!</Text>
          </View>
        )}
      />

      {/* Topup Modal */}
      <Modal visible={topupOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setTopupOpen(false)}>
        <View style={[styles.modalRoot, { backgroundColor: C.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: C.border }]} />
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Hisobni to'ldirish</Text>
            <Pressable onPress={() => setTopupOpen(false)}>
              <Ionicons name="close" size={24} color={C.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
            {/* Miqdor */}
            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>Miqdor (so'm)</Text>
              <TextInput
                style={[styles.bigInput, { backgroundColor: C.card, color: C.text, borderColor: C.border }]}
                placeholder="0"
                placeholderTextColor={C.textSecondary}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {QUICK.map(q => (
                    <Pressable key={q} style={[styles.quickChip, { borderColor: C.border, backgroundColor: C.card }]} onPress={() => setAmount(String(q))}>
                      <Text style={[styles.quickChipText, { color: C.text }]}>{fmt(q)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Provayder */}
            <View>
              <Text style={[styles.fieldLabel, { color: C.text }]}>To'lov usuli</Text>
              <View style={{ gap: 10 }}>
                {PROVIDERS.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => setProvider(p.id)}
                    style={[styles.providerRow, {
                      backgroundColor: provider === p.id ? p.color + "15" : C.card,
                      borderColor: provider === p.id ? p.color : C.border,
                    }]}
                  >
                    <View style={[styles.providerIcon, { backgroundColor: p.color }]}>
                      <Ionicons name={p.icon} size={20} color="#fff" />
                    </View>
                    <Text style={[styles.providerLabel, { color: C.text }]}>{p.label}</Text>
                    {provider === p.id && <Ionicons name="checkmark-circle" size={22} color={p.color} style={{ marginLeft: "auto" }} />}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Jami */}
            {amount && Number(amount) >= 1000 && (
              <View style={[styles.summaryBox, { backgroundColor: C.card, borderColor: C.border }]}>
                <Text style={[styles.sumLabel, { color: C.textSecondary }]}>To'lanadigan summa</Text>
                <Text style={[styles.sumVal, { color: C.text }]}>{fmt(Number(amount))}</Text>
              </View>
            )}
          </ScrollView>

          <View style={{ padding: 20, paddingBottom: insets.bottom + 10 }}>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: C.primary, opacity: topping ? 0.7 : 1 }]}
              onPress={handleTopup}
              disabled={topping}
            >
              {topping ? <ActivityIndicator color="#fff" /> : <Ionicons name="card" size={22} color="#fff" />}
              <Text style={styles.actionBtnText}>{topping ? "Tayyorlanmoqda..." : "To'lov havolasi yaratish"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 24 },
  cardIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.25)", justifyContent: "center", alignItems: "center" },
  balanceText: { fontSize: 36, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 20 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 16 },
  cardDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.2)" },
  topupBtn: { marginHorizontal: 20, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, gap: 10, marginBottom: 16 },
  topupBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
  statsRow: { flexDirection: "row", marginHorizontal: 20, gap: 12, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, borderWidth: 1 },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 4 },
  statVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  txIcon: { width: 38, height: 38, borderRadius: 19, justifyContent: "center", alignItems: "center" },
  txType: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  txDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  txAmount: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 2 },
  txBalance: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  emptyHint: { fontSize: 14, fontFamily: "Inter_400Regular" },
  // Modal
  modalRoot: { flex: 1 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  bigInput: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  quickChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  quickChipText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  providerRow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 14, borderWidth: 1.5 },
  providerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  providerLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  summaryBox: { borderRadius: 14, padding: 16, borderWidth: 1, alignItems: "center", gap: 4 },
  sumLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sumVal: { fontSize: 26, fontFamily: "Inter_700Bold" },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, paddingVertical: 18 },
  actionBtnText: { color: "#fff", fontSize: 17, fontFamily: "Inter_700Bold" },
});
