/** A random number generator returning floats in [0, 1). */
export type Rng = () => number;

export const defaultRng: Rng = Math.random;

/** Small, fast, seedable PRNG (deterministic for tests). */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle; returns a new array. */
export function shuffle<T>(arr: readonly T[], rng: Rng): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Up to n distinct items, in random order. */
export function sample<T>(arr: readonly T[], n: number, rng: Rng): T[] {
  return shuffle(arr, rng).slice(0, Math.max(0, n));
}

/** Pick up to n distinct items without replacement, proportional to weight. */
export function pickWeighted<T>(
  items: readonly T[],
  weights: readonly number[],
  n: number,
  rng: Rng,
): T[] {
  const pool = items.map((item, i) => ({ item, w: Math.max(0, weights[i] ?? 0) }));
  const out: T[] = [];
  while (out.length < n && pool.length > 0) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let idx = pool.length - 1;
    if (total > 0) {
      let r = rng() * total;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].w;
        if (r < 0) {
          idx = i;
          break;
        }
      }
    } else {
      idx = Math.floor(rng() * pool.length);
    }
    out.push(pool[idx].item);
    pool.splice(idx, 1);
  }
  return out;
}
