import { useEffect, useRef, useCallback } from "react";
import { useNotificationSound } from "./use-notification-sound";

const BASE = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
const POLL_MS = 15_000;

interface InAppNotification {
  id: number;
  title: string;
  body: string;
  type: string;
  soundType?: string;
  isRead: boolean;
  createdAt: string;
}

type NotifCallback = (notif: InAppNotification) => void;

export function useLiveNotifications(onNew?: NotifCallback) {
  const { play } = useNotificationSound();
  const lastSeenId = useRef<number>(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNew = useCallback(async () => {
    try {
      const token = localStorage.getItem("gethelp_token");
      if (!token) return;

      const res = await fetch(`${BASE}/api/in-app-notifications?limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: InAppNotification[] = data.notifications || data || [];

      if (!Array.isArray(list) || !list.length) return;

      const newest = list[0];
      if (!newest) return;

      if (lastSeenId.current === 0) {
        lastSeenId.current = newest.id;
        return;
      }

      const newOnes = list.filter(n => n.id > lastSeenId.current);
      if (!newOnes.length) return;

      lastSeenId.current = newOnes[0].id;

      for (const notif of newOnes.reverse()) {
        const st = notif.soundType || notif.type;
        if (st === "rental_start") play("rental_start");
        else if (st === "rental_return") play("rental_return");
        else if (st === "payment" || st === "deposit_return") play("payment");
        else play("alert");

        onNew?.(notif);
      }
    } catch (_e) {
      // sessiz
    }
  }, [play, onNew]);

  useEffect(() => {
    fetchNew();
    timer.current = setInterval(fetchNew, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [fetchNew]);
}
