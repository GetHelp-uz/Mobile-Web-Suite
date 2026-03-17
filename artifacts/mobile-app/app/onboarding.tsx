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
    gradient: ["#FF6B1A", "#E84D0E"] as [string, string],
    accentColor: "#fff",
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&q=85",
    icon: "hammer-outline" as const,
    badge: "O'zbekiston #1",
    title: "Qurilish asboblarini\nijara oling",
    description:
      "Beton aralashtiruvchi, perforator, bolg'a drill va yuzlab boshqa asboblar — bir joyda. Kunlik, haftalik yoki oylik ijara.",
    fact: "2 000+ asbob, 500+ do'kon",
  },
  {
    id: 2,
    gradient: ["#1A6FDB", "#0E4FA3"] as [string, string],
    accentColor: "#fff",
    image: "https://images.unsplash.com/photo-1563986768494-4747b3a1d148?w=700&q=85",
    icon: "shield-checkmark-outline" as const,
    badge: "100% Xavfsiz",
    title: "Qulay va xavfsiz\nto'lovlar",
    description:
      "Click, Payme, Paynet yoki naqd pul orqali bir zumda to'lang. Barcha tranzaktsiyalar shifrlangan va kafolatli.",
    fact: "Naqd pul + 3 ta raqamli to'lov",
  },
  {
    id: 3,
    gradient: ["#12B76A", "#0A8050"] as [string, string],
    accentColor: "#fff",
    image: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&q=85",
    icon: "notifications-outline" as const,
    badge: "Real vaqt",
    title: "Qaytarish sanasini\nhech unutmang",
    description:
      "Ijaraga olgan asbobingizni qaytarish sanasidan 1 kun oldin SMS xabarnoma olasiz. GPS orqali asbob joylashuvini kuzating.",
    fact: "SMS eslatma + GPS kuzatuv",
  },
];

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

  async function finishOnboarding() {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await AsyncStorage.setItem("onboarding_done", "1");
    router.replace("/auth/login");
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

            {/* Orqa fon naqshi */}
            <View style={styles.patternCircle1} />
            <View style={styles.patternCircle2} />

            {/* Rasm */}
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

            {/* Badge */}
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{s.badge}</Text>
              </View>
            </View>

            {/* Matn */}
            <View style={styles.textBlock}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.description}>{s.description}</Text>

              {/* Fakt */}
              <View style={styles.factRow}>
                <Ionicons name={s.icon as any} size={20} color="rgba(255,255,255,0.9)" />
                <Text style={styles.factText}>{s.fact}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Ustki boshqaruv: Skip */}
      {!isLast && (
        <Pressable
          style={[styles.skipBtn, { top: insets.top + 16 }]}
          onPress={handleSkip}
        >
          <Text style={styles.skipText}>O'tkazib yuborish</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
        </Pressable>
      )}

      {/* Quyi panel */}
      <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 16 }]}>
        {/* Nuqtalar */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <Pressable
              key={i}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * width, animated: true });
              }}
            >
              <View
                style={[
                  styles.dot,
                  i === activeIndex && styles.dotActive,
                  { backgroundColor: i === activeIndex ? slide.gradient[0] : "rgba(0,0,0,0.15)" },
                ]}
              />
            </Pressable>
          ))}
        </View>

        {isLast ? (
          /* Oxirgi sahifa — kirish/ro'yhatdan o'tish */
          <View style={styles.authButtons}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, { backgroundColor: SLIDES[2].gradient[0], opacity: pressed ? 0.85 : 1 }]}
              onPress={finishOnboarding}
            >
              <Ionicons name="log-in-outline" size={22} color="#fff" />
              <Text style={styles.btnPrimaryText}>Kirish</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.btnSecondary, { opacity: pressed ? 0.7 : 1 }]}
              onPress={async () => {
                await AsyncStorage.setItem("onboarding_done", "1");
                router.replace("/auth/register");
              }}
            >
              <Ionicons name="person-add-outline" size={22} color={SLIDES[2].gradient[0]} />
              <Text style={[styles.btnSecondaryText, { color: SLIDES[2].gradient[0] }]}>
                Ro'yhatdan o'tish
              </Text>
            </Pressable>

            <Text style={styles.termsText}>
              Davom etish orqali foydalanish shartlarini qabul qilasiz
            </Text>
          </View>
        ) : (
          /* Keyingi tugma */
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
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -60,
  },
  patternCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: 200,
    left: -50,
  },

  imageContainer: {
    width: "100%",
    height: height * 0.46,
    marginTop: 80,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },

  badgeRow: {
    position: "absolute",
    top: 60,
    left: 24,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },

  textBlock: {
    position: "absolute",
    bottom: 180,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginBottom: 14,
    lineHeight: 38,
  },
  description: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 22,
    marginBottom: 16,
  },
  factRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  factText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
  },

  skipBtn: {
    position: "absolute",
    right: 20,
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
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 10,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
  },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },

  authButtons: {
    gap: 12,
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
    color: "#999",
    marginTop: 4,
  },
});
