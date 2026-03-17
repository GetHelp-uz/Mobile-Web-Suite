import { useCallback, useRef } from "react";

type SoundType = "rental_start" | "rental_return" | "payment" | "alert" | "success" | "message";

function createAudioContext(): AudioContext | null {
  try {
    return new (window.AudioContext || (window as any).webkitAudioContext)();
  } catch {
    return null;
  }
}

function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.3
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(gainVal, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration);
}

const SOUND_PATTERNS: Record<SoundType, (ctx: AudioContext) => void> = {
  rental_start: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 523, t, 0.15, "sine", 0.35);
    playTone(ctx, 659, t + 0.15, 0.15, "sine", 0.35);
    playTone(ctx, 784, t + 0.3, 0.25, "sine", 0.4);
  },
  rental_return: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 659, t, 0.15, "sine", 0.35);
    playTone(ctx, 784, t + 0.15, 0.15, "sine", 0.35);
    playTone(ctx, 1047, t + 0.3, 0.3, "sine", 0.4);
  },
  payment: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 880, t, 0.1, "sine", 0.3);
    playTone(ctx, 1100, t + 0.12, 0.2, "sine", 0.35);
  },
  alert: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 440, t, 0.1, "square", 0.25);
    playTone(ctx, 440, t + 0.15, 0.1, "square", 0.25);
    playTone(ctx, 440, t + 0.3, 0.2, "square", 0.3);
  },
  success: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 784, t, 0.1, "sine", 0.3);
    playTone(ctx, 988, t + 0.12, 0.2, "sine", 0.35);
  },
  message: (ctx) => {
    const t = ctx.currentTime;
    playTone(ctx, 523, t, 0.08, "sine", 0.2);
    playTone(ctx, 659, t + 0.1, 0.15, "sine", 0.25);
  },
};

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: SoundType = "success") => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = createAudioContext();
      }
      const ctx = ctxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") {
        ctx.resume().then(() => {
          SOUND_PATTERNS[type]?.(ctx);
        });
      } else {
        SOUND_PATTERNS[type]?.(ctx);
      }
    } catch (e) {
      // Sound play failed silently
    }
  }, []);

  return { play };
}

export function showBrowserNotification(title: string, body: string, icon = "/favicon.svg") {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(title, { body, icon, tag: "gethelp-" + Date.now() });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then(perm => {
      if (perm === "granted") {
        new Notification(title, { body, icon, tag: "gethelp-" + Date.now() });
      }
    });
  }
}
