import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 daqiqa
const WARNING_BEFORE = 2 * 60 * 1000;       // Chiqishdan 2 daqiqa oldin ogohlantirish
const STORAGE_KEY = "gh_last_activity";
const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");

export function useAutoLogout() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningToastRef = useRef<any>(null);

  const resetTimers = useCallback(() => {
    if (!user) return;
    localStorage.setItem(STORAGE_KEY, Date.now().toString());

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // 2 daqiqa oldin ogohlantirish
    warningRef.current = setTimeout(() => {
      warningToastRef.current = toast({
        title: "Sessiya tugayapti",
        description: "2 daqiqadan so'ng tizimdan avtomatik chiqasiz. Davom etish uchun istalgan joyni bosing.",
        duration: 120000,
      });
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    // Avtomatik chiqish
    timeoutRef.current = setTimeout(async () => {
      try {
        const token = localStorage.getItem("gethelp_token");
        if (token) {
          await fetch(`${BASE}/api/auth/logout`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      } finally {
        logout();
        toast({
          title: "Sessiya tugadi",
          description: "30 daqiqa faolsizlik tufayli tizimdan chiqarildingiz.",
          duration: 5000,
        });
      }
    }, INACTIVITY_TIMEOUT);
  }, [user, logout, toast]);

  useEffect(() => {
    if (!user) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      return;
    }

    const EVENTS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];

    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleActivity = () => {
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        resetTimers();
      }, 10000); // 10 soniyada bir marta yangilash
    };

    EVENTS.forEach(evt => document.addEventListener(evt, handleActivity, { passive: true }));
    resetTimers();

    // Tab ko'rinishligini tekshirish
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const lastActivity = parseInt(localStorage.getItem(STORAGE_KEY) || "0");
        const idle = Date.now() - lastActivity;
        if (idle > INACTIVITY_TIMEOUT) {
          logout();
          toast({
            title: "Sessiya tugadi",
            description: "Uzoq vaqt faolsizlik tufayli tizimdan chiqarildingiz.",
          });
        } else {
          resetTimers();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Ko'p tabda sinxronlashtirish
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "gethelp_token" && !e.newValue) {
        // Boshqa tabda logout qilingan
        window.location.href = `${BASE}/login`;
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      EVENTS.forEach(evt => document.removeEventListener(evt, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [user, resetTimers, logout, toast]);
}
