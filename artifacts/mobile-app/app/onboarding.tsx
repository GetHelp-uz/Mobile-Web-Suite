import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const SLIDES = [
  {
    id: 1,
    role: "customer",
    gradient: ["#FF6B1A", "#D94800"] as [string, string],
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&q=85",
    icon: "hammer-outline" as const,
    badge: "Mijoz uchun",
    title: "Kerakli asbobni\nijara oling",
    description:
      "Beton aralashtiruvchi, perforator, bolg'a drill va 2000+ asbob — bir joyda. Kunlik, haftalik yoki oylik qulay narxlarda.",
    stats: [
      { icon: "construct-outline", text: "2 000+ asbob" },
      { icon: "storefront-outline", text: "500+ do'kon" },
    ],
  },
  {
    id: 2,
    role: "customer",
    gradient: ["#1A6FDB", "#0A3D8F"] as [string, string],
    image: "https://images.unsplash.com/photo-1563986768494-4747b3a1d148?w=700&q=85",
    icon: "card-outline" as const,
    badge: "Mijoz uchun",
    title: "Qulay to'lov\nva kafolat",
    description:
      "Click, Payme, Paynet yoki naqd pul orqali bir zumda to'lang. Barcha tranzaksiyalar shifrlangan. Depozit xavfsiz saqlanadi.",
    stats: [
      { icon: "shield-checkmark-outline", text: "100% xavfsiz" },
      { icon: "notifications-outline", text: "SMS eslatma" },
    ],
  },
  {
    id: 3,
    role: "shop",
    gradient: ["#12B76A", "#077A47"] as [string, string],
    image: "https://images.unsplash.com/photo-1581094651181-35942459ef62?w=700&q=85",
    icon: "storefront-outline" as const,
    badge: "Do'kon egasi uchun",
    title: "Do'koningizni\nregistratsiya qiling",
    description:
      "Asboblaringizni GetHelp.uz platformasida e'lon qiling. Minglab mijozlar sizning asboblaringizni ijaraga oladi. Boshlash bepul!",
    stats: [
      { icon: "people-outline", text: "Ko'p mijoz" },
      { icon: "trending-up-outline", text: "Daromad oshadi" },
    ],
  },
  {
    id: 4,
    role: "shop",
    gradient: ["#7C3AED", "#4C1D95"] as [string, string],
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=700&q=85",
    icon: "stats-chart-outline" as const,
    badge: "Do'kon egasi uchun",
    title: "Daromad va\nboshqaruv",
    description:
      "QR kod orqali ijara boshlang, GPS bilan asbobni kuzating, statistika, xodimlar, zaxira — hammasini bir yerdan boshqaring.",
    stats: [
      { icon: "qr-code-outline", text: "QR scanner" },
      { icon: "location-outline", text: "GPS kuzatuv" },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  customer: "Mijoz",
  shop: "Do'kon egasi",
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setActiveIndex(idx);
  }

  async function goNext() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (activeIndex + 1) * width, animated: true });
    }
  }

  async function finishOnboarding(toRegister = false) {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem("onboarding_done", "1");
    if (toRegister) {
      router.replace("/auth/register");
    } else {
      router.replace("/auth/login");
    }
  }

  async function handleSkip() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await AsyncStorage.setItem("onboarding_done", "1");
    router.replace("/auth/login");
  }

  const slide = SLIDES[activeIndex];
  const isLast = activeIndex === SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {SLIDES.map((s) => (
          <View key={s.id} style={[styles.slide, { width }]}>
            <LinearGradient
              colors={s.gradient}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.patternCircle1} />
            <View style={styles.patternCircle2} />

            <View style={styles.imageContainer}>
              <Image
                source={{ uri: s.image }}
                style={styles.image}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["transparent", s.gradient[1]]}
                style={styles.imageOverlay}
              />
            </View>

            <View style={[styles.badgeRow, { top: insets.top + 48 }]}>
              <View style={styles.badge}>
                <Ionicons name={s.icon as any} size={14} color="rgba(255,255,255,0.9)" />
                <Text style={styles.badgeText}>{s.badge}</Text>
              </View>
            </View>

            <View style={styles.textBlock}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.description}>{s.description}</Text>

              <View style={styles.statsRow}>
                {s.stats.map((st, i) => (
                  <View key={i} style={styles.statChip}>
                    <Ionicons name={st.icon as any} size={16} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.statText}>{st.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {!isLast && (
        <Pressable
          style={[styles.skipBtn, { top: insets.top + 12 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>O'tkazish</Text>
          <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}

      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.dotsRow}>
          {SLIDES.map((s, i) => {
            const isActive = i === activeIndex;
            const isSameRole = s.role === slide.role;
            return (
              <Pressable
                key={i}
                onPress={() => {
                  scrollRef.current?.scrollTo({ x: i * width, animated: true });
                }}
              >
                <View
                  style={[
                    styles.dot,
                    isActive
                      ? [styles.dotActive, { backgroundColor: slide.gradient[0] }]
                      : { backgroundColor: isSameRole ? `${slide.gradient[0]}44` : "#E0E0E0" },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={styles.roleRow}>
          <Text style={[styles.roleLabel, { color: slide.gradient[0] }]}>
            {activeIndex + 1}/{SLIDES.length}
          </Text>
          <Text style={styles.roleName}>
            {ROLE_LABEL[slide.role]} uchun
          </Text>
        </View>

        {isLast ? (
          <View style={styles.authButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.btnPrimary,
                { backgroundColor: slide.gradient[0], opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={() => finishOnboarding(false)}
            >
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.btnPrimaryText}>Kirish</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => finishOnboarding(true)}
            >
              <Ionicons name="person-add-outline" size={22} color={slide.gradient[0]} />
              <Text style={[styles.btnSecondaryText, { color: slide.gradient[0] }]}>
                Ro'yxatdan o'tish
              </Text>
            </Pressable>

            <Text style={styles.termsText}>
              Davom etish orqali foydalanish shartlarini qabul qilasiz
            </Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              { backgroundColor: slide.gradient[0], opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={goNext}
          >
            <Text style={styles.nextBtnText}>Keyingi</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  slide: { height, position: "relative", overflow: "hidden" },

  patternCircle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -100,
    right: -70,
  },
  patternCircle2: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.05)",
    bottom: 220,
    left: -60,
  },

  imageContainer: {
    width: "100%",
    height: height * 0.44,
    marginTop: 90,
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },

  badgeRow: {
    position: "absolute",
    left: 22,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },

  textBlock: {
    position: "absolute",
    bottom: 185,
    left: 0,
    right: 0,
    paddingHorizontal: 26,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 12,
    lineHeight: 38,
  },
  description: {
    fontSize: 14.5,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  statText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
  },

  skipBtn: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.18)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  skipText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  bottomPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 12,
  },

  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 7,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 26,
    borderRadius: 4,
  },

  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  roleName: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#888",
  },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 6,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },

  authButtons: {
    gap: 11,
  },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    backgroundColor: "#F5F5F5",
  },
  btnSecondaryText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  termsText: {
    textAlign: "center",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#AAA",
    marginTop: 2,
  },
});
