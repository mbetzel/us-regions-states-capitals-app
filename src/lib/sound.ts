// Short synthesized sounds with the Web Audio API. No audio files, no library.
// Every public function is a no-op when sound is disabled or Web Audio is missing,
// and none of them throw.

let context: AudioContext | null = null;

interface AudioWindow {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

/** One shared AudioContext, created on first use. Browsers only allow it after a user gesture. */
function getContext(): AudioContext | null {
  if (context) return context;
  try {
    if (typeof window === 'undefined') return null;
    const w = window as unknown as AudioWindow;
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

/** Schedules one soft tone with a gentle attack and release. */
function tone(
  ac: AudioContext,
  frequency: number,
  startAfter: number,
  duration: number,
  type: OscillatorType,
  peak: number,
): void {
  const start = ac.currentTime + startAfter;
  const oscillator = ac.createOscillator();
  const gain = ac.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ac.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

/** Runs the notes through the shared context, or does nothing if sound is off or unavailable. */
function play(enabled: boolean, notes: (ac: AudioContext) => void): void {
  if (!enabled) return;
  try {
    const ac = getContext();
    if (!ac) return;
    if (ac.state === 'suspended') void ac.resume().catch(() => undefined);
    notes(ac);
  } catch {
    // Sound is a nice-to-have. A failure must never break the quiz.
  }
}

/** Short, pleasant two-note "ding" for a correct answer. */
export function playCorrect(enabled: boolean): void {
  play(enabled, (ac) => {
    tone(ac, 660, 0, 0.12, 'sine', 0.18);
    tone(ac, 880, 0.12, 0.12, 'sine', 0.18);
  });
}

/** Soft, low "boop" for a wrong answer. Deliberately quiet, never a buzzer. */
export function playWrong(enabled: boolean): void {
  play(enabled, (ac) => {
    tone(ac, 220, 0, 0.18, 'triangle', 0.08);
  });
}

/** Four-note rising arpeggio for finishing a round. */
export function playFanfare(enabled: boolean): void {
  play(enabled, (ac) => {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((frequency, i) => {
      const last = i === notes.length - 1;
      tone(ac, frequency, i * 0.12, last ? 0.35 : 0.12, 'sine', 0.16);
    });
  });
}
