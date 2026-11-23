import type { Rng } from '../quiz/rng';

export const PRAISE: readonly string[] = [
  'Awesome!',
  'You got it!',
  'Geography genius!',
  'Super!',
  'Way to go!',
];

/** Picks a random praise message. The RNG is injectable for tests. */
export function pickPraise(rng: Rng = Math.random): string {
  const index = Math.min(PRAISE.length - 1, Math.floor(rng() * PRAISE.length));
  return PRAISE[index];
}
