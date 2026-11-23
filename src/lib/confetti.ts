import confetti from 'canvas-confetti';
import { prefersReducedMotion } from './motion';

// Every burst is skipped for reduced motion, both here and inside canvas-confetti.
const base = { disableForReducedMotion: true } as const;

/** A quick burst for a correct answer. */
export function smallBurst(): void {
  if (prefersReducedMotion()) return;
  void confetti({ ...base, particleCount: 40, spread: 60, origin: { y: 0.7 } });
}

/** A bigger burst from both sides, for a streak of 5, 10, and so on. */
export function bigBurst(): void {
  if (prefersReducedMotion()) return;
  void confetti({ ...base, particleCount: 90, spread: 100, origin: { y: 0.65 } });
  void confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.8 } });
  void confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.8 } });
}

/** A few spaced bursts for finishing a round with two or more stars. */
export function celebration(): void {
  if (prefersReducedMotion()) return;
  void confetti({ ...base, particleCount: 120, spread: 90, origin: { y: 0.6 } });
  setTimeout(() => bigBurst(), 350);
  setTimeout(() => bigBurst(), 900);
}
