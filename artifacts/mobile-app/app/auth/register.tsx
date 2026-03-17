import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
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

type Step = "role" | "info" | "location";
type Role = "customer" | "shop_owner";

const ROLES: { id: Role; label: string; sub: string; icon: "person-outline" | "storefront-outline"; gradient: [string, string] }[] = [
  {
    id: "customer",
    label: "Mijoz sifatida",
    sub: "Asboblarni ijara oling va loyihalaringizni osongina boshqaring",
    icon: "person-outline",
    gradient: ["#1A6FDB", "#0E4FA3"],
  },
  {
    id: "shop_owner",
    label: "Do'kon sifatida",
    sub: "Asboblaringizni ijaraga bering va daromad oling",
    icon: "storefront-outline",
    gradient: ["#FF6B1A", "#E84D0E"],
  },
];

function formatPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 0) return "";
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
}

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const C = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [phoneDigits, setPhoneDigits] = useState("");
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

  const roleObj = ROLES.find(r => r.id === selectedRole);

  function onSelectRole(role: Role) {
    setSelectedRole(role);
    Haptics.selectionAsync();
  }

  function onRoleNext() {
    if (!selectedRole) {
      Alert.alert("Xato", "Iltimos, hisobing turini tanlang");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("info");
  }

  function validateInfo(): boolean {
    if (!name.trim() || name.trim().length < 3) {
      Alert.alert("Xato", "Ism familya kamida 3 ta harf bo'lishi kerak");
      return false;
    }
    const digits = phoneDigits.replace(/\D/g, "");
    if (digits.length !== 9) {
      Alert.alert(
        "Telefon raqam xato",
        "O'zbekiston telefon raqamini kiriting.\n\nMasalan: 90 123 45 67\n(+998 dan keyin 9 ta raqam)"
      );
      return false;
    }
    if (password.length < 6) {
      Alert.alert("Xato", "Parol kamida 6 ta belgi bo'lishi kerak");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("Xato", "Parollar mos emas. Qayta tekshiring");
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

  function onInfoNext() {
    if (!validateInfo()) return;
    Haptics.selectionAsync();
    setStep("location");
  }

  async function onRegister() {
    if (!validateLocation()) return;
    setIsLoading(true);
    try {
      const digits = phoneDigits.replace(/\D/g, "");
      const finalPhone = `998${digits}`;
      await register({
        name: name.trim(),
        phone: finalPhone,
        password,
        role: selectedRole || "customer",
        region: region!.name,
        district: district!.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)");
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err.message || "Ro'yhatdan o'tishda xatolik yuz berdi";
      Alert.alert("Xato", msg);
    } finally {
      setIsLoading(false);
    }
  }

  function goBack() {
    if (step === "location") { setStep("info"); return; }
    if (step === "info") { setStep("role"); return; }
    router.back();
  }

  const stepIndex = step === "role" ? 0 : step === "info" ? 1 : 2;
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
            onPress={goBack}
          >
            <Ionicons name="arrow-back" size={20} color={C.text} />
          </Pressable>
          {/* Qadam ko'rsatkichi */}
          <View style={styles.stepIndicator}>
            {[0, 1, 2].map((i) => (
              <React.Fragment key={i}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: i <= stepIndex ? C.primary : C.border }
                ]} />
                {i < 2 && (
                  <View style={[
                    styles.stepLine,
                    { backgroundColor: i < stepIndex ? C.primary : C.border }
                  ]} />
                )}
              </React.Fragment>
            ))}
          </View>
          <Text style={[styles.stepLabel, { color: C.textMuted }]}>
            {stepIndex + 1}/3
          </Text>
        </View>

        {/* ===== STEP 0: ROL TANLASH ===== */}
        {step === "role" && (
          <>
            <View style={styles.titleBlock}>
              <View style={[styles.iconBox, { backgroundColor: C.primary }]}>
                <Ionicons name="people-outline" size={28} color="#fff" />
              </View>
              <Text style={[styles.title, { color: C.text }]}>
                Xush kelibsiz!
              </Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                GetHelp.uz ga kim sifatida ro'yhatdan o'tmoqchisiz?
              </Text>
            </View>

            <View style={styles.roleCards}>
              {ROLES.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <Pressable
                    key={role.id}
                    style={({ pressed }) => [
                      styles.roleCard,
                      {
                        borderColor: isSelected ? role.gradient[0] : C.border,
                        backgroundColor: C.surface,
                        opacity: pressed ? 0.9 : 1,
                        transform: [{ scale: isSelected ? 1.01 : 1 }],
                      }
                    ]}
                    onPress={() => onSelectRole(role.id)}
                  >
                    <LinearGradient
                      colors={isSelected ? role.gradient : [C.surfaceSecondary, C.surfaceSecondary]}
                      style={styles.roleIconBox}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons
                        name={role.icon}
                        size={32}
                        color={isSelected ? "#fff" : C.textMuted}
                      />
                    </LinearGradient>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleLabel, { color: C.text }]}>
                        {role.label}
                      </Text>
                      <Text style={[styles.roleSub, { color: C.textSecondary }]}>
                        {role.sub}
                      </Text>
                    </View>

                    <View style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? role.gradient[0] : C.border,
                        backgroundColor: isSelected ? role.gradient[0] : "transparent",
                      }
                    ]}>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedRole && (
              <View style={[styles.selectedInfo, {
                backgroundColor: (roleObj?.gradient[0] ?? C.primary) + "12",
                borderColor: (roleObj?.gradient[0] ?? C.primary) + "35",
              }]}>
                <Ionicons
                  name={roleObj?.icon ?? "person-outline"}
                  size={18}
                  color={roleObj?.gradient[0] ?? C.primary}
                />
                <Text style={[styles.selectedInfoText, { color: roleObj?.gradient[0] ?? C.primary }]}>
                  {selectedRole === "shop_owner"
                    ? "Do'kon sifatida: asboblaringizni boshqarasiz va ijaraga berasiz"
                    : "Mijoz sifatida: kerakli asboblarni topib ijara olasiz"}
                </Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [
                styles.btn,
                {
                  backgroundColor: selectedRole ? C.primary : C.border,
                  opacity: pressed ? 0.88 : 1,
                }
              ]}
              onPress={onRoleNext}
            >
              <Text style={styles.btnText}>Davom etish</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </>
        )}

        {/* ===== STEP 1: MA'LUMOTLAR ===== */}
        {step === "info" && (
          <>
            <View style={styles.titleBlock}>
              <View style={[styles.iconBox, { backgroundColor: roleObj?.gradient[0] ?? C.primary }]}>
                <Ionicons name="person-add-outline" size={28} color="#fff" />
              </View>
              <Text style={[styles.title, { color: C.text }]}>
                Shaxsiy ma'lumotlar
              </Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                {selectedRole === "shop_owner"
                  ? "Do'kon egasi sifatida ma'lumotlaringizni kiriting"
                  : "Mijoz sifatida ma'lumotlaringizni kiriting"}
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              {/* Ism */}
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

              {/* Telefon */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: C.text }]}>Telefon raqam</Text>
                <View style={[styles.inputWrap, { borderColor: C.border, backgroundColor: C.surfaceSecondary }]}>
                  <View style={styles.phonePrefixBox}>
                    <Text style={[styles.phonePrefix, { color: C.text }]}>+998</Text>
                  </View>
                  <View style={[styles.phoneDivider, { backgroundColor: C.border }]} />
                  <TextInput
                    style={[styles.input, { color: C.text }]}
                    placeholder="90 123 45 67"
                    placeholderTextColor={C.textMuted}
                    value={formatPhoneDisplay(phoneDigits)}
                    onChangeText={(t) => {
                      const cleaned = t.replace(/\D/g, "");
                      if (cleaned.length <= 9) {
                        setPhoneDigits(cleaned);
                      }
                    }}
                    keyboardType="phone-pad"
                    maxLength={14}
                    returnKeyType="next"
                  />
                  {phoneDigits.length === 9 && (
                    <Ionicons name="checkmark-circle" size={18} color="#12B76A" />
                  )}
                </View>
                <Text style={[styles.hint, { color: C.textMuted }]}>
                  9 ta raqam kiriting (masalan: 90 123 45 67)
                </Text>
              </View>

              {/* Parol */}
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
                {password.length > 0 && (
                  <View style={styles.strengthRow}>
                    {[1, 2, 3, 4].map(i => (
                      <View
                        key={i}
                        style={[
                          styles.strengthBar,
                          {
                            backgroundColor: password.length >= i * 2
                              ? password.length >= 8 ? "#12B76A" : "#FF6B1A"
                              : C.border
                          }
                        ]}
                      />
                    ))}
                    <Text style={[styles.strengthText, { color: C.textMuted }]}>
                      {password.length < 6 ? "Kuchsiz" : password.length < 8 ? "O'rtacha" : "Kuchli"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Parolni tasdiqlash */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: C.text }]}>Parolni tasdiqlang</Text>
                <View style={[
                  styles.inputWrap,
                  {
                    borderColor: confirmPassword && confirmPassword !== password ? "#ef4444" : C.border,
                    backgroundColor: C.surfaceSecondary,
                  }
                ]}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: C.text }]}
                    placeholder="Parolni qayta kiriting"
                    placeholderTextColor={C.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={onInfoNext}
                  />
                  {confirmPassword.length > 0 && (
                    <Ionicons
                      name={confirmPassword === password ? "checkmark-circle" : "close-circle"}
                      size={18}
                      color={confirmPassword === password ? "#12B76A" : "#ef4444"}
                    />
                  )}
                </View>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <Text style={[styles.hint, { color: "#ef4444" }]}>Parollar mos emas</Text>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [styles.btn, { backgroundColor: C.primary, opacity: pressed ? 0.88 : 1 }]}
                onPress={onInfoNext}
              >
                <Text style={styles.btnText}>Keyingisi</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          </>
        )}

        {/* ===== STEP 2: JOYLASHUV ===== */}
        {step === "location" && (
          <>
            <View style={styles.titleBlock}>
              <View style={[styles.iconBox, { backgroundColor: roleObj?.gradient[0] ?? C.primary }]}>
                <Ionicons name="location-outline" size={28} color="#fff" />
              </View>
              <Text style={[styles.title, { color: C.text }]}>Joylashuvingiz</Text>
              <Text style={[styles.subtitle, { color: C.textSecondary }]}>
                Yaqin atrofdagi asboblarni topish uchun hududingizni tanlang
              </Text>
            </View>

            <View style={[styles.card, { backgroundColor: C.surface, borderColor: C.border }]}>
              {/* Viloyat */}
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

              {/* Tuman */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: C.text }]}>Tuman</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.picker,
                    {
                      borderColor: district ? C.primary : C.border,
                      backgroundColor: C.surfaceSecondary,
                      opacity: !region ? 0.5 : pressed ? 0.85 : 1,
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
                      GetHelp.uz ommaviy oferta shartlari
                    </Text>
                    {" bilan tanishdim va roziman"}
                  </Text>
                </View>
              </TouchableOpacity>

              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  {
                    backgroundColor: agreedToTerms ? (roleObj?.gradient[0] ?? C.primary) : C.border,
                    opacity: pressed && !isLoading && agreedToTerms ? 0.88 : isLoading ? 0.7 : 1,
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
          </>
        )}

        {/* Kirish linki */}
        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: C.textSecondary }]}>Hisobingiz bormi?</Text>
          <Pressable onPress={() => router.replace("/auth/login")}>
            <Text style={[styles.loginLink, { color: C.primary }]}>{"  "}Kirish</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Viloyat modali */}
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

      {/* Tuman modali */}
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
            showsVerticalScrollIndicator
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    justifyContent: "space-between",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
  },
  stepIndicator: { flexDirection: "row", alignItems: "center", gap: 0 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { width: 32, height: 2, marginHorizontal: 4 },
  stepLabel: { fontSize: 13, fontFamily: "Inter_500Medium", minWidth: 30, textAlign: "right" },

  titleBlock: { alignItems: "center", marginBottom: 28 },
  iconBox: {
    width: 68, height: 68, borderRadius: 20,
    justifyContent: "center", alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", marginBottom: 6, textAlign: "center" },
  subtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, paddingHorizontal: 20 },

  roleCards: { gap: 14, marginBottom: 20 },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  roleIconBox: {
    width: 60, height: 60, borderRadius: 16,
    justifyContent: "center", alignItems: "center",
  },
  roleLabel: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  roleSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  radioCircle: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: "center", alignItems: "center",
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  selectedInfoText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },

  card: {
    borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  inputWrap: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, gap: 8,
  },
  inputIcon: {},
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  eyeBtn: { padding: 2 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 5 },

  phonePrefixBox: { paddingRight: 4 },
  phonePrefix: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  phoneDivider: { width: 1, height: 20, marginRight: 4 },

  strengthRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  strengthBar: { flex: 1, height: 3, borderRadius: 2 },
  strengthText: { fontSize: 11, fontFamily: "Inter_500Medium", marginLeft: 4 },

  picker: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, borderWidth: 1, gap: 8,
  },
  pickerText: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  locationPreview: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14,
  },
  locationText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  ofertaRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 16,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    justifyContent: "center", alignItems: "center", marginTop: 1,
  },
  ofertaText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  ofertaLink: { fontFamily: "Inter_600SemiBold", textDecorationLine: "underline" },

  btn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 14, paddingVertical: 15,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },

  loginRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  loginText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loginLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  modal: { flex: 1 },
  modalHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 20, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  modalItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 16, borderBottomWidth: 1,
  },
  modalItemText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  modalItemSub: { fontSize: 12, fontFamily: "Inter_400Regular" },

  ofertaContent: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  ofertaActions: {
    flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1,
  },
  ofertaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, padding: 14, borderRadius: 12, borderWidth: 1, flex: 1,
  },
  ofertaBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
