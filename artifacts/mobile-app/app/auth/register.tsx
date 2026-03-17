import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { REGIONS, Region, District, getDistrictsByRegion } from "@/constants/regions";

const OFERTA_TEXT = `GETHELP.UZ PLATFORMASI UCHUN OMMAVIY OFERTA SHARTLARI
VA SHAXSIY MA'LUMOTLARNI QAYTA ISHLASHGA ROZILIK

1. Umumiy qoidalar

Ushbu ommaviy oferta GetHelp.uz platformasi orqali qurilish asbob-uskunalarini ijaraga berish xizmatidan foydalanish tartibini belgilaydi.

Platformada ro'yxatdan o'tgan foydalanuvchi ushbu Oferta shartlari bilan tanishib chiqib, ularga to'liq rozilik bildirgan hisoblanadi.

2. Xizmat tavsifi

GetHelp.uz platformasi quyidagi imkoniyatlarni taqdim etadi:
- qurilish asbob-uskunalarini tanlash
- uskunalarni ijaraga olish
- QR kod orqali uskunani olish va qaytarish
- onlayn to'lovlar (Click, Payme, Paynet)
- ijara tarixini kuzatish

3. Mijoz majburiyatlari

1. Ro'yxatdan o'tishda to'g'ri ma'lumotlarni taqdim etish.
2. Uskunalardan ehtiyotkorlik bilan foydalanish.
3. Uskunani uchinchi shaxslarga bermaslik.
4. Uskunani belgilangan muddatda qaytarish.
5. Zarar uchun javobgar bo'lish.

4. Depozit va to'lovlar

Ba'zi uskunalar uchun depozit talab qilinadi. Uskuna shikastlanganda depozitdan zarar qoplanadi.

5. Javobgarlik

Uskuna shikastlansa yoki yo'qolsa, mijoz zararni to'liq qoplaydi. Platforma noto'g'ri foydalanish natijasidagi zarar uchun javobgar emas.

6. Shaxsiy ma'lumotlarni qayta ishlash

Ro'yxatdan o'tishda taqdim etilgan ma'lumotlar (ism, telefon, ijara tarixi) xizmat ko'rsatish, to'lovlarni amalga oshirish va xavfsizlikni ta'minlash maqsadida qayta ishlanadi.

7. Ma'lumotlarni himoya

Shaxsiy ma'lumotlar uchinchi shaxslarga faqat qonun talabi yoki to'lov tizimlari orqali tranzaksiya uchun taqdim etilishi mumkin.

8. Yakuniy qoidalar

GetHelp.uz oferta shartlariga o'zgartirish kiritish huquqiga ega. Platformadan foydalanish yangilangan shartlarga rozilikni anglatadi.`;

type Step = "info" | "location";

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>("info");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [region, setRegion] = useState<Region | null>(null);
  const [district, setDistrict] = useState<District | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [regionModalVisible, setRegionModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [ofertaVisible, setOfertaVisible] = useState(false);

  function validateInfo(): boolean {
    if (!name.trim() || name.trim().length < 3) {
      Alert.alert("Xato", "Ism familya kamida 3 ta harf bo'lishi kerak");
      return false;
    }
    const phoneClean = phone.replace(/\D/g, "");
    const is9digits = phoneClean.length === 9;
    const is12digits = phoneClean.length === 12 && phoneClean.startsWith("998");
    if (!is9digits && !is12digits) {
      Alert.alert(
        "Xato",
        "Telefon raqamni to'g'ri kiriting\n\nMasalan: 90 123 45 67\n(+998 dan keyin 9 ta raqam)"
      );
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Xato", "Parol kamida 6 ta belgi bo'lishi kerak");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Xato", "Parollar mos emas");
      return false;
    }
    return true;
  }

  function validateLocation(): boolean {
    if (!region) {
      Alert.alert("Xato", "Viloyatni tanlang");
      return false;
    }
    if (!district) {
      Alert.alert("Xato", "Tumanni tanlang");
      return false;
    }
    if (!agreedToTerms) {
      Alert.alert("Xato", "Oferta shartlarini qabul qilishingiz kerak");
      return false;
    }
    return true;
  }

  function onNextStep() {
    if (!validateInfo()) return;
    Haptics.selectionAsync();
    setStep("location");
  }

  async function onRegister() {
    if (!validateLocation()) return;
    setIsLoading(true);
    try {
      const phoneClean = phone.replace(/\D/g, "");
      const finalPhone = phoneClean.startsWith("998") ? phoneClean : `998${phoneClean}`;
      await register({
        name: name.trim(),
        phone: finalPhone,
        password,
        region: region!.name,
        district: district!.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Alert.alert("Xato", err.message || "Ro'yhatdan o'tishda xatolik yuz berdi");
    } finally {
      setIsLoading(false);
    }
  }

  const districts = region ? getDistrictsByRegion(region.id) : [];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: C.surfaceSecondary }]}
            onPress={() => step === "location" ? setStep("info") : router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          <View style={styles.stepIndicator}>
            <View style={[styles.stepDot, { backgroundColor: C.primary }]} />
            <View style={[styles.stepLine, { backgroundColor: step === "location" ? C.primary : C.border }]} />
            <View style={[styles.stepDot, { backgroundColor: step === "location" ? C.primary : C.border }]} />
          </View>
        </View>

        {/* Title */}
        <View style={styles.titleBlock}>
          <View style={[styles.iconBox, { backgroundColor: C.primary }]}>
            <Ionicons name={step === "info" ? "person-add-outline" : "location-outline"} size={28} color="#fff" />
          </View>
          <Text style={[styles.title, { color: C.text }]}>
            {step === "info" ? "Ro'yhatdan o'tish" : "Joylashuvingiz"}
          </Text>
          <Text style={[styles.subtitle, { color: C.textSecondary }]}>
            {step === "info"
              ? "Shaxsiy ma'lumotlaringizni kiriting"
              : "Yaqin atrofdagi asboblarni topish uchun hududingizni tanlang"}
          </Text>
        </View>

        {step === "info" ? (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Name */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Ism Familya</Text>
              <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="person-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="Masalan: Jasur Rahimov"
                  placeholderTextColor={C.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
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
              <Text style={[styles.hint, { color: C.textMuted }]}>+998 dan keyin kiriting</Text>
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
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
                  returnKeyType="next"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={C.textMuted} />
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Parolni tasdiqlang</Text>
              <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  placeholder="Parolni qayta kiriting"
                  placeholderTextColor={C.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={onNextStep}
                />
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.btn, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
              onPress={onNextStep}
            >
              <Text style={styles.btnText}>Keyingisi</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
            {/* Region picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Viloyat</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.picker,
                  { borderColor: region ? C.primary : C.border, backgroundColor: C.surfaceSecondary, opacity: pressed ? 0.85 : 1 }
                ]}
                onPress={() => setRegionModalVisible(true)}
              >
                <Ionicons name="map-outline" size={18} color={region ? C.primary : C.textMuted} style={styles.inputIcon} />
                <Text style={[styles.pickerText, { color: region ? C.text : C.textMuted }]}>
                  {region ? region.name : "Viloyatni tanlang..."}
                </Text>
                <Ionicons name="chevron-down" size={18} color={C.textMuted} />
              </Pressable>
            </View>

            {/* District picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: C.text }]}>Tuman</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.picker,
                  {
                    borderColor: district ? C.primary : C.border,
                    backgroundColor: C.surfaceSecondary,
                    opacity: (pressed && !!region) ? 0.85 : !region ? 0.5 : 1,
                  }
                ]}
                onPress={() => region && setDistrictModalVisible(true)}
                disabled={!region}
              >
                <Ionicons name="location-outline" size={18} color={district ? C.primary : C.textMuted} style={styles.inputIcon} />
                <Text style={[styles.pickerText, { color: district ? C.text : C.textMuted }]}>
                  {district ? district.name : region ? "Tumanni tanlang..." : "Avval viloyatni tanlang"}
                </Text>
                <Ionicons name="chevron-down" size={18} color={C.textMuted} />
              </Pressable>
            </View>

            {region && district && (
              <View style={[styles.locationPreview, { backgroundColor: C.primary + "12", borderColor: C.primary + "30" }]}>
                <Ionicons name="location" size={16} color={C.primary} />
                <Text style={[styles.locationText, { color: C.primary }]}>
                  {region.name}, {district.name}
                </Text>
              </View>
            )}

            {/* Oferta roziligi */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setAgreedToTerms(v => !v)}
              style={[
                styles.ofertaRow,
                {
                  backgroundColor: agreedToTerms ? "#16a34a15" : C.surfaceSecondary,
                  borderColor: agreedToTerms ? "#16a34a" : C.border,
                }
              ]}
            >
              <View style={[
                styles.checkbox,
                {
                  backgroundColor: agreedToTerms ? "#16a34a" : "transparent",
                  borderColor: agreedToTerms ? "#16a34a" : C.textMuted,
                }
              ]}>
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.ofertaText, { color: C.text }]}>
                  {"Men "}
                  <Text
                    style={[styles.ofertaLink, { color: C.primary }]}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setOfertaVisible(true);
                    }}
                  >
                    GetHelp.uz platformasining ommaviy oferta shartlari
                  </Text>
                  {" bilan tanishdim va ularga roziman hamda shaxsiy ma'lumotlarimni qayta ishlashga rozilik bildiraman."}
                </Text>
              </View>
            </TouchableOpacity>

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: agreedToTerms ? C.primary : C.border,
                  opacity: (pressed && !isLoading && agreedToTerms) ? 0.88 : isLoading ? 0.7 : 1,
                }
              ]}
              onPress={onRegister}
              disabled={isLoading || !agreedToTerms}
            >
              {isLoading ? (
                <Text style={styles.btnText}>Ro'yhatdan o'tilmoqda...</Text>
              ) : (
                <>
                  <Text style={styles.btnText}>Ro'yhatdan o'tish</Text>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Login link */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: C.textSecondary }]}>Hisobingiz bormi?</Text>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={[styles.loginLink, { color: C.primary }]}>  Kirish</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Region Modal */}
      <Modal
        visible={regionModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRegionModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Viloyatni tanlang</Text>
            <Pressable onPress={() => setRegionModalVisible(false)}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>
          <FlatList
            data={REGIONS}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.modalItem,
                  {
                    backgroundColor: region?.id === item.id ? C.primary + "15" : pressed ? C.surfaceSecondary : "transparent",
                    borderBottomColor: C.border,
                  }
                ]}
                onPress={() => {
                  setRegion(item);
                  setDistrict(null);
                  setRegionModalVisible(false);
                  Haptics.selectionAsync();
                }}
              >
                <Ionicons
                  name={region?.id === item.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={region?.id === item.id ? C.primary : C.textMuted}
                />
                <Text style={[styles.modalItemText, { color: region?.id === item.id ? C.primary : C.text }]}>
                  {item.name}
                </Text>
                <Text style={[styles.modalItemSub, { color: C.textMuted }]}>
                  {item.districts.length} tuman
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* District Modal */}
      <Modal
        visible={districtModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setDistrictModalVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>{region?.name} tumanlari</Text>
            <Pressable onPress={() => setDistrictModalVisible(false)}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>
          <FlatList
            data={districts}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.modalItem,
                  {
                    backgroundColor: district?.id === item.id ? C.primary + "15" : pressed ? C.surfaceSecondary : "transparent",
                    borderBottomColor: C.border,
                  }
                ]}
                onPress={() => {
                  setDistrict(item);
                  setDistrictModalVisible(false);
                  Haptics.selectionAsync();
                }}
              >
                <Ionicons
                  name={district?.id === item.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color={district?.id === item.id ? C.primary : C.textMuted}
                />
                <Text style={[styles.modalItemText, { color: district?.id === item.id ? C.primary : C.text }]}>
                  {item.name}
                </Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>

      {/* Oferta matni modali */}
      <Modal
        visible={ofertaVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOfertaVisible(false)}
      >
        <View style={[styles.modal, { backgroundColor: C.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>Ommaviy Oferta Shartlari</Text>
            <Pressable onPress={() => setOfertaVisible(false)}>
              <Ionicons name="close" size={24} color={C.text} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 16 }}
            showsVerticalScrollIndicator={true}
          >
            <Text style={[styles.ofertaContent, { color: C.textSecondary }]}>
              {OFERTA_TEXT}
            </Text>
          </ScrollView>
          <View style={[styles.ofertaActions, { borderTopColor: C.border, paddingBottom: insets.bottom + 16 }]}>
            <Pressable
              style={[styles.ofertaBtn, { backgroundColor: C.surfaceSecondary, borderColor: C.border }]}
              onPress={() => setOfertaVisible(false)}
            >
              <Text style={[styles.ofertaBtnText, { color: C.text }]}>Yopish</Text>
            </Pressable>
            <Pressable
              style={[styles.ofertaBtn, { backgroundColor: "#16a34a", flex: 1.5 }]}
              onPress={() => {
                setAgreedToTerms(true);
                setOfertaVisible(false);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={[styles.ofertaBtnText, { color: "#fff" }]}>Roziman</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, flexGrow: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 28, justifyContent: "space-between" },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  stepIndicator: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { width: 48, height: 2 },
  titleBlock: { alignItems: "center", marginBottom: 28, gap: 10 },
  iconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 8 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 6, marginBottom: 20 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, height: 48, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 6 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  picker: {
    flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1.5,
    paddingHorizontal: 12, height: 52,
  },
  pickerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  locationPreview: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 4 },
  locationText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  ofertaRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 14, borderRadius: 12, borderWidth: 1.5, marginTop: 6, marginBottom: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: "center", alignItems: "center", marginTop: 1, flexShrink: 0,
  },
  ofertaText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  ofertaLink: { fontSize: 13, fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },
  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, height: 52, marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8 },
  loginText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loginLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modal: { flex: 1 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  modalItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0.5,
  },
  modalItemText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  modalItemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ofertaContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  ofertaActions: { flexDirection: "row", gap: 12, padding: 16, borderTopWidth: 1 },
  ofertaBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 12, height: 48, borderWidth: 1,
  },
  ofertaBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
