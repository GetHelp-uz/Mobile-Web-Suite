import { Audio } from "expo-av";

type SoundType = "success" | "error" | "payment" | "rental_return";

const BEEP_FREQS: Record<SoundType, number[]> = {
  success: [880, 1100],
  error: [400, 300],
  payment: [660, 880, 1100],
  rental_return: [1100, 880, 660],
};

async function generateBeep(frequencies: number[], durationMs = 120): Promise<void> {
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: false });
    for (const freq of frequencies) {
      const sampleRate = 22050;
      const numSamples = Math.floor((sampleRate * durationMs) / 1000);
      const pcm = new Int16Array(numSamples);
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.sin((Math.PI * i) / numSamples);
        pcm[i] = Math.floor(32767 * envelope * Math.sin(2 * Math.PI * freq * t));
      }
      const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm.buffer)));
      const uri = `data:audio/wav;base64,${wavHeader(numSamples, sampleRate)}${base64}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      await new Promise(r => setTimeout(r, durationMs + 30));
      await sound.unloadAsync();
    }
  } catch (_e) {
    // Jimgina - ekranda hech narsa ko'rsatilmaydi
  }
}

function wavHeader(numSamples: number, sampleRate: number): string {
  const byteRate = sampleRate * 2;
  const dataSize = numSamples * 2;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);
  const write = (offset: number, val: number, size: number) => {
    if (size === 4) view.setUint32(offset, val, true);
    else if (size === 2) view.setUint16(offset, val, true);
  };
  "RIFF".split("").forEach((c, i) => view.setUint8(i, c.charCodeAt(0)));
  write(4, 36 + dataSize, 4);
  "WAVE".split("").forEach((c, i) => view.setUint8(8 + i, c.charCodeAt(0)));
  "fmt ".split("").forEach((c, i) => view.setUint8(12 + i, c.charCodeAt(0)));
  write(16, 16, 4);
  write(20, 1, 2);
  write(22, 1, 2);
  write(24, sampleRate, 4);
  write(28, byteRate, 4);
  write(32, 2, 2);
  write(34, 16, 2);
  "data".split("").forEach((c, i) => view.setUint8(36 + i, c.charCodeAt(0)));
  write(40, dataSize, 4);
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

export async function playSound(type: SoundType): Promise<void> {
  await generateBeep(BEEP_FREQS[type]);
}
