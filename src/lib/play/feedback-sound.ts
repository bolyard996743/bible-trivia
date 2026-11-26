export type FeedbackTone = "correct" | "miss";

type GainParam = {
  setValueAtTime: (value: number, time: number) => void;
  linearRampToValueAtTime: (value: number, time: number) => void;
  exponentialRampToValueAtTime: (value: number, time: number) => void;
};

export type FeedbackAudio = {
  currentTime: number;
  destination: unknown;
  createOscillator: () => {
    type: string;
    frequency: GainParam;
    connect: (node: unknown) => void;
    start: (when?: number) => void;
    stop: (when?: number) => void;
  };
  createGain: () => {
    gain: GainParam;
    connect: (node: unknown) => void;
  };
};

const TONES: Record<FeedbackTone, { from: number; to: number; duration: number; gain: number }> = {
  correct: { from: 523.25, to: 659.25, duration: 0.22, gain: 0.045 },
  miss: { from: 392, to: 311.13, duration: 0.2, gain: 0.035 },
};

export function shouldPlayFeedback(soundOn: boolean): boolean {
  return soundOn;
}

/** Soft sine tones. Returns false, and touches no audio nodes, when sound is off. */
export function playFeedbackTone(kind: FeedbackTone, soundOn: boolean, context: FeedbackAudio | null): boolean {
  if (!shouldPlayFeedback(soundOn) || !context) return false;
  const tone = TONES[kind];
  const osc = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime;
  osc.type = "sine";
  osc.frequency.setValueAtTime(tone.from, start);
  osc.frequency.linearRampToValueAtTime(tone.to, start + tone.duration);
  gain.gain.setValueAtTime(tone.gain, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
  osc.connect(gain);
  gain.connect(context.destination);
  osc.start(start);
  osc.stop(start + tone.duration + 0.02);
  return true;
}

let shared: AudioContext | null = null;

/** Plays from the answer tap, which is a user gesture. Silent when the Sound toggle is off. */
export function playAnswerSound(kind: FeedbackTone, soundOn: boolean): boolean {
  if (!shouldPlayFeedback(soundOn)) return false;
  if (typeof window === "undefined") return false;
  const Ctor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return false;
  try {
    if (!shared || shared.state === "closed") shared = new Ctor();
    if (shared.state === "suspended") void shared.resume();
    return playFeedbackTone(kind, true, shared as unknown as FeedbackAudio);
  } catch {
    return false;
  }
}
