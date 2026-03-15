import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

function WorkerCard({
  worker,
  onRemove,
}: {
  worker: any;
  onRemove: (id: number) => void;
}) {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const initials = worker.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={[styles.workerCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <View style={[styles.avatar, { backgroundColor: "#22C55E20" }]}>
        <Text style={[styles.avatarText, { color: "#16A34A" }]}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.workerName, { color: C.text }]}>{worker.name}</Text>
        <View style={styles.workerMeta}>
          <Ionicons name="call-outline" size={13} color={C.textMuted} />
          <Text style={[styles.workerPhone, { color: C.textMuted }]}>{worker.phone}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: worker.isActive ? "#DCFCE7" : "#FEE2E2" }]}>
          <Text style={[styles.statusText, { color: worker.isActive ? "#16A34A" : "#DC2626" }]}>
            {worker.isActive ? "Faol" : "Nofaol"}
          </Text>
        </View>
      </View>
      <Pressable
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.7 : 1 }]}
        onPress={() => onRemove(worker.id)}
      >
        <Ionicons name="trash-outline" size={18} color="#EF4444" />
      </Pressable>
    </View>
  );
}

export default function WorkersScreen() {
  const isDark = useColorScheme() === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [createdWorker, setCreatedWorker] = useState<any>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["workers"],
    queryFn: () => api.workers.list(),
    enabled: user?.role === "shop_owner",
  });

  const createMutation = useMutation({
    mutationFn: (d: { name: string; phone: string; password: string }) =>
      api.workers.create(d),
    onSuccess: (res) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["workers"] });
      setCreatedWorker({ ...res.worker, rawPassword: password });
      setModalVisible(false);
      setName("");
      setPhone("");
      setPassword("");
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Xato", err.message || "Hodim qo'shishda xatolik");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: number) => api.workers.remove(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      queryClient.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (err: any) => {
      Alert.alert("Xato", err.message);
    },
  });

  function handleAdd() {
    const phoneClean = phone.replace(/\D/g, "");
    const is9 = phoneClean.length === 9;
    const is12 = phoneClean.length === 12 && phoneClean.startsWith("998");
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert("Xato", "Ism familya kamida 2 ta harf bo'lishi kerak");
      return;
    }
    if (!is9 && !is12) {
      Alert.alert("Xato", "Telefon raqamni to'g'ri kiriting\nMasalan: 90 123 45 67");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Xato", "Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    const finalPhone = phoneClean.startsWith("998") ? phoneClean : `998${phoneClean}`;
    createMutation.mutate({ name: name.trim(), phone: finalPhone, password });
  }

  function handleRemove(id: number) {
    Alert.alert("Hodimni o'chirish", "Haqiqatan ham bu hodimni o'chirmoqchimisiz?", [
      { text: "Bekor", style: "cancel" },
      {
        text: "O'chirish",
        style: "destructive",
        onPress: () => removeMutation.mutate(id),
      },
    ]);
  }

  const workers = data?.workers || [];

  return (
    <View style={[styles.root, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: C.background, borderBottomColor: C.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: C.text }]}>Hodimlar</Text>
          <Text style={[styles.headerSub, { color: C.textMuted }]}>{workers.length} ta hodim</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.addBtn, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Qo'shish</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : workers.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: C.surfaceSecondary }]}>
            <Ionicons name="people-outline" size={40} color={C.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: C.text }]}>Hodimlar yo'q</Text>
          <Text style={[styles.emptySub, { color: C.textMuted }]}>Birinchi hodimingizni qo'shing</Text>
          <Pressable
            style={[styles.emptyBtn, { backgroundColor: C.primary }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Hodim qo'shish</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={workers}
          keyExtractor={(w) => String(w.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={C.primary} />}
          renderItem={({ item }) => (
            <WorkerCard worker={item} onRemove={handleRemove} />
          )}
        />
      )}

      {/* Add Worker Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: C.background }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: C.text }]}>Hodim qo'shish</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.text} />
              </Pressable>
            </View>

            <View style={[styles.infoBox, { backgroundColor: C.primary + "12", borderColor: C.primary + "30" }]}>
              <Ionicons name="information-circle-outline" size={18} color={C.primary} />
              <Text style={[styles.infoText, { color: C.primary }]}>
                Hodim bu telefon va parol bilan ilovaga kiradi
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.text }]}>Ism Familya</Text>
              <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="person-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="Masalan: Jasur Karimov"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.text }]}>Telefon raqam</Text>
              <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="call-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="90 123 45 67"
                  placeholderTextColor={C.textMuted}
                  value={phone}
                  onChangeText={(t) => {
                    const cleaned = t.replace(/\D/g, "");
                    if (cleaned.length <= 9) setPhone(cleaned);
                    else if (cleaned.startsWith("998") && cleaned.length <= 12) setPhone(cleaned);
                  }}
                  keyboardType="phone-pad"
                  maxLength={12}
                  returnKeyType="next"
                />
              </View>
              <Text style={[styles.hint, { color: C.textMuted }]}>+998 dan keyin 9 ta raqam</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: C.text }]}>Parol</Text>
              <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="Kamida 6 ta belgi"
                  placeholderTextColor={C.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: C.primary, opacity: (pressed || createMutation.isPending) ? 0.85 : 1 }
              ]}
              onPress={handleAdd}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.submitText}>Hodim qo'shish</Text>
                </>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Success Modal — show credentials */}
      <Modal
        visible={!!createdWorker}
        animationType="fade"
        transparent
        onRequestClose={() => setCreatedWorker(null)}
      >
        <View style={styles.overlay}>
          <View style={[styles.successCard, { backgroundColor: C.surface }]}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={52} color="#22C55E" />
            </View>
            <Text style={[styles.successTitle, { color: C.text }]}>Hodim qo'shildi!</Text>
            <Text style={[styles.successSub, { color: C.textMuted }]}>
              Quyidagi ma'lumotlarni hodimga bering:
            </Text>

            <View style={[styles.credBox, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}>
              <View style={styles.credRow}>
                <Text style={[styles.credLabel, { color: C.textMuted }]}>Ism:</Text>
                <Text style={[styles.credValue, { color: C.text }]}>{createdWorker?.name}</Text>
              </View>
              <View style={[styles.credDivider, { backgroundColor: C.border }]} />
              <View style={styles.credRow}>
                <Text style={[styles.credLabel, { color: C.textMuted }]}>Telefon:</Text>
                <Text style={[styles.credValue, { color: C.text }]}>{createdWorker?.phone}</Text>
              </View>
              <View style={[styles.credDivider, { backgroundColor: C.border }]} />
              <View style={styles.credRow}>
                <Text style={[styles.credLabel, { color: C.textMuted }]}>Parol:</Text>
                <Text style={[styles.credValue, { color: "#1A6FDB", fontFamily: "Inter_700Bold" }]}>
                  {createdWorker?.rawPassword}
                </Text>
              </View>
            </View>

            <Text style={[styles.warningText, { color: C.textMuted }]}>
              Parolni eslab qoling — keyinchalik ko'rib bo'lmaydi
            </Text>

            <Pressable
              style={[styles.doneBtn, { backgroundColor: C.primary }]}
              onPress={() => setCreatedWorker(null)}
            >
              <Text style={styles.doneBtnText}>Tushunarli</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12,
  },
  addBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  workerCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10,
  },
  avatar: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  workerName: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  workerMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  workerPhone: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  removeBtn: { padding: 8 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  infoBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  infoText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 20 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52, marginTop: 8,
  },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  successCard: { borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 8 },
  successIcon: { marginBottom: 4 },
  successTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  successSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 4 },
  credBox: { width: "100%", borderRadius: 14, borderWidth: 1, overflow: "hidden", marginVertical: 8 },
  credRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  credLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  credValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  credDivider: { height: 1 },
  warningText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  doneBtn: { width: "100%", alignItems: "center", justifyContent: "center", borderRadius: 14, height: 50, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
