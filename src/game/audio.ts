const MUTED_KEY = "bma_muted";

type BrowserWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

let audioContext: AudioContext | null = null;
let muted: boolean | null = null;

function readMuted(): boolean {
  if (muted !== null) return muted;
  if (typeof window === "undefined") return false;

  try {
    muted = window.localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    muted = false;
  }
  return muted;
}

function context(): AudioContext | null {
  if (!audioContext) initAudio();
  return audioContext;
}

function tone(
  frequency: number,
  duration: number,
  options: {
    delay?: number;
    endFrequency?: number;
    gain?: number;
    type?: OscillatorType;
  } = {},
): void {
  if (readMuted()) return;
  const ctx = context();
  if (!ctx) return;

  const start = ctx.currentTime + (options.delay ?? 0);
  const end = start + duration;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  if (options.endFrequency !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, options.endFrequency), end);
  }

  const peak = options.gain ?? 0.08;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.015, duration / 3));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(end);
  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    gain.disconnect();
  });
}

export function initAudio(): void {
  if (typeof window === "undefined") return;

  if (!audioContext) {
    const AudioContextClass = window.AudioContext ?? (window as BrowserWindow).webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      audioContext = new AudioContextClass();
    } catch {
      audioContext = null;
      return;
    }
  }

  if (audioContext.state === "suspended") {
    void audioContext.resume().catch(() => {});
  }
}

export function setMuted(m: boolean): void {
  muted = m;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MUTED_KEY, String(m));
    } catch {
      // Muting still works for this session if persistence is unavailable.
    }
  }
  if (!m) initAudio();
}

export function isMuted(): boolean {
  return readMuted();
}

export function playClick(): void {
  tone(620, 0.045, { endFrequency: 480, gain: 0.04, type: "square" });
}

export function playBid(): void {
  tone(440, 0.07, { endFrequency: 660, gain: 0.055, type: "triangle" });
  tone(660, 0.08, { delay: 0.055, endFrequency: 880, gain: 0.05, type: "triangle" });
}

export function playCoin(): void {
  tone(1200, 0.08, { gain: 0.045, type: "sine" });
  tone(1650, 0.12, { delay: 0.06, gain: 0.04, type: "sine" });
  tone(2100, 0.14, { delay: 0.13, gain: 0.035, type: "sine" });
}

export function playGavel(): void {
  tone(150, 0.1, { endFrequency: 70, gain: 0.11, type: "square" });
  tone(105, 0.13, { delay: 0.12, endFrequency: 55, gain: 0.1, type: "square" });
}

export function playLose(): void {
  tone(330, 0.18, { endFrequency: 220, gain: 0.065, type: "sawtooth" });
  tone(220, 0.28, { delay: 0.15, endFrequency: 110, gain: 0.06, type: "sawtooth" });
}

export function playWin(): void {
  tone(523.25, 0.13, { gain: 0.055, type: "triangle" });
  tone(659.25, 0.13, { delay: 0.1, gain: 0.055, type: "triangle" });
  tone(783.99, 0.22, { delay: 0.2, gain: 0.06, type: "triangle" });
}

export function playIntel(): void {
  tone(760, 0.1, { endFrequency: 1100, gain: 0.04, type: "sine" });
  tone(1020, 0.16, { delay: 0.08, endFrequency: 1450, gain: 0.035, type: "sine" });
}

export function playError(): void {
  tone(190, 0.11, { gain: 0.06, type: "square" });
  tone(150, 0.16, { delay: 0.1, gain: 0.055, type: "square" });
}
