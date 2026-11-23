import { REGIONS, REGION_BY_ID, type RegionId } from '../data/regions';
import { STATES, STATE_BY_FIPS } from '../data/states';
import { pickWeighted, sample, shuffle, type Rng } from './rng';

export type Mode = 'regions' | 'states' | 'capitals';

export interface Question {
  id: string; // "states:17"
  mode: Mode;
  targetKey: string; // regionId or fips
  prompt: string;
  choices: string[]; // 4 labels, shuffled
  answer: string; // correct label
}

export interface ItemProgress {
  seen: number;
  correct: number;
  box: 0 | 1 | 2 | 3;
}
export type Progress = Record<string, ItemProgress>;
export type RoundLength = 10 | 20 | 'all';

const CHOICE_COUNT = 4;
const BOX_WEIGHTS: Record<0 | 1 | 2 | 3, number> = { 0: 8, 1: 4, 2: 2, 3: 1 };

export function allItemIds(mode: Mode): string[] {
  return mode === 'regions' ? REGIONS.map((r) => r.id) : STATES.map((s) => s.fips);
}

function answerFor(mode: Mode, targetKey: string): string {
  if (mode === 'regions') return REGION_BY_ID[targetKey as RegionId].name;
  const s = STATE_BY_FIPS[targetKey];
  return mode === 'states' ? s.name : s.capital;
}

/** Add unique candidates (not already in `chosen`) until `limit` reached. */
function fill(chosen: string[], candidates: string[], limit: number): void {
  for (const c of candidates) {
    if (chosen.length >= limit) return;
    if (!chosen.includes(c)) chosen.push(c);
  }
}

export function makeChoices(mode: Mode, targetKey: string, rng: Rng): string[] {
  const answer = answerFor(mode, targetKey);
  const chosen = [answer];

  if (mode === 'regions') {
    fill(
      chosen,
      shuffle(
        REGIONS.map((r) => r.name),
        rng,
      ),
      CHOICE_COUNT,
    );
    return shuffle(chosen, rng);
  }

  const target = STATE_BY_FIPS[targetKey];
  const others = STATES.filter((s) => s.fips !== targetKey);
  const sameRegion = shuffle(
    others.filter((s) => s.region === target.region),
    rng,
  );
  const elsewhere = shuffle(
    others.filter((s) => s.region !== target.region),
    rng,
  );
  const label = (s: (typeof STATES)[number]) => (mode === 'states' ? s.name : s.capital);

  if (mode === 'states') {
    const nSame = Math.min(sameRegion.length, Math.min(2, 1 + Math.floor(rng() * 2)));
    fill(chosen, sameRegion.slice(0, nSame).map(label), CHOICE_COUNT);
    fill(chosen, elsewhere.map(label), CHOICE_COUNT);
    fill(chosen, sameRegion.map(label), CHOICE_COUNT);
  } else {
    if (target.famousCity) fill(chosen, [target.famousCity], CHOICE_COUNT);
    fill(chosen, sameRegion.map(label), CHOICE_COUNT);
    fill(chosen, elsewhere.map(label), CHOICE_COUNT);
  }
  return shuffle(chosen, rng);
}

export function makeQuestion(mode: Mode, targetKey: string, rng: Rng): Question {
  let prompt: string;
  if (mode === 'regions') prompt = 'What region is highlighted?';
  else if (mode === 'states') prompt = 'What state is highlighted?';
  else prompt = `What is the capital of ${STATE_BY_FIPS[targetKey].name}?`;
  return {
    id: `${mode}:${targetKey}`,
    mode,
    targetKey,
    prompt,
    choices: makeChoices(mode, targetKey, rng),
    answer: answerFor(mode, targetKey),
  };
}

export function buildRound(
  mode: Mode,
  length: RoundLength,
  progress: Progress,
  rng: Rng,
  { practiceMistakes = false }: { practiceMistakes?: boolean } = {},
): Question[] {
  const ids = allItemIds(mode);
  const count = length === 'all' ? ids.length : Math.min(length, ids.length);
  let picked: string[];
  if (length === 'all') {
    picked = shuffle(ids, rng);
  } else if (practiceMistakes) {
    const weights = ids.map((key) => BOX_WEIGHTS[safeBox(progress[`${mode}:${key}`]?.box)]);
    picked = pickWeighted(ids, weights, count, rng);
  } else {
    picked = sample(ids, count, rng);
  }
  return picked.map((key) => makeQuestion(mode, key, rng));
}

/** Clamp a possibly corrupt stored box value to 0..3. */
function safeBox(box: unknown): 0 | 1 | 2 | 3 {
  return typeof box === 'number' && box >= 0 && box <= 3 ? (Math.floor(box) as 0 | 1 | 2 | 3) : 0;
}

export function grade(question: Question, choice: string): boolean {
  return question.answer === choice;
}

export function updateProgress(progress: Progress, questionId: string, correct: boolean): Progress {
  const prev = progress[questionId] ?? { seen: 0, correct: 0, box: 0 };
  const box = correct ? (Math.min(3, safeBox(prev.box) + 1) as 0 | 1 | 2 | 3) : 0;
  return {
    ...progress,
    [questionId]: {
      seen: prev.seen + 1,
      correct: prev.correct + (correct ? 1 : 0),
      box,
    },
  };
}

export function starsFor(score: number, total: number): 0 | 1 | 2 | 3 {
  if (total <= 0) return 0;
  const pct = score / total;
  if (pct >= 1) return 3;
  if (pct >= 0.8) return 2;
  if (pct >= 0.6) return 1;
  return 0;
}
