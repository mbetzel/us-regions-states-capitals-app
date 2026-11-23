import { create } from 'zustand';
import { createJSONStorage, persist, type PersistStorage } from 'zustand/middleware';
import {
  buildRound,
  grade,
  starsFor,
  updateProgress,
  type Mode,
  type Progress,
  type Question,
  type RoundLength,
} from '../quiz/engine';
import { defaultRng, type Rng } from '../quiz/rng';
import { safeStorage } from './safeStorage';

export const STORAGE_KEY = 'usgeo:v1';
export const STORE_VERSION = 1;

const MODES: readonly Mode[] = ['regions', 'states', 'capitals'];
const ROUND_LENGTHS: readonly RoundLength[] = [10, 20, 'all'];

export type Stars = 0 | 1 | 2 | 3;

export interface Settings {
  roundLength: RoundLength;
  sound: boolean;
  practiceMistakes: boolean;
}

export interface BestScore {
  stars: Stars;
  /** Best score for this mode as a whole percentage, 0-100. */
  bestPct: number;
  /** ISO 8601 timestamp of the most recent finished round in this mode. */
  lastPlayed: string;
}

export interface ActiveRound {
  mode: Mode;
  questions: Question[];
  index: number;
  answers: (string | null)[];
}

export interface LastResult {
  mode: Mode;
  questions: Question[];
  answers: (string | null)[];
  score: number;
  total: number;
  stars: Stars;
}

/** The slice of state that is written to localStorage. */
export interface PersistedState {
  settings: Settings;
  progress: Progress;
  bestScores: Partial<Record<Mode, BestScore>>;
  activeRound: ActiveRound | null;
  lastResult: LastResult | null;
}

export interface AppActions {
  setRoundLength: (length: RoundLength) => void;
  toggleSound: () => void;
  togglePracticeMistakes: () => void;
  /** Builds a new round from the current settings and progress. Clears lastResult. */
  startRound: (mode: Mode, rng?: Rng) => void;
  /**
   * Records the answer for the current question. Only the first answer per question counts;
   * later calls change nothing and return the correctness of the recorded answer.
   * Returns false when there is no active round.
   */
  answerCurrent: (choice: string) => boolean;
  /** Advances to the next question. After the last question, finishes the round. */
  nextQuestion: () => void;
  /** Drops the active round without recording a result. */
  abandonRound: () => void;
  /** Clears progress, best scores, active round and last result. Keeps settings. */
  resetProgress: () => void;
}

export type AppState = PersistedState & AppActions;

export const DEFAULT_SETTINGS: Settings = { roundLength: 10, sound: true, practiceMistakes: false };

/** Data-only defaults. Used as the initial state and to reset the store in tests. */
export const initialState: PersistedState = {
  settings: { ...DEFAULT_SETTINGS },
  progress: {},
  bestScores: {},
  activeRound: null,
  lastResult: null,
};

// ---------------------------------------------------------------------------
// Validation. Persisted data is untrusted (old versions, hand edits, corruption),
// so every field is checked and falls back to its default when invalid.
// ---------------------------------------------------------------------------

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isMode = (v: unknown): v is Mode => typeof v === 'string' && (MODES as string[]).includes(v);
const isStars = (v: unknown): v is Stars => v === 0 || v === 1 || v === 2 || v === 3;
const isBox = (v: unknown): v is 0 | 1 | 2 | 3 => isStars(v);
const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function sanitizeSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    roundLength: ROUND_LENGTHS.includes(s.roundLength as RoundLength)
      ? (s.roundLength as RoundLength)
      : DEFAULT_SETTINGS.roundLength,
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULT_SETTINGS.sound,
    practiceMistakes:
      typeof s.practiceMistakes === 'boolean'
        ? s.practiceMistakes
        : DEFAULT_SETTINGS.practiceMistakes,
  };
}

function sanitizeProgress(v: unknown): Progress {
  if (!isObj(v)) return {};
  const out: Progress = {};
  for (const [key, item] of Object.entries(v)) {
    if (isObj(item) && isFiniteNum(item.seen) && isFiniteNum(item.correct) && isBox(item.box)) {
      out[key] = { seen: item.seen, correct: item.correct, box: item.box };
    }
  }
  return out;
}

function sanitizeBestScores(v: unknown): Partial<Record<Mode, BestScore>> {
  if (!isObj(v)) return {};
  const out: Partial<Record<Mode, BestScore>> = {};
  for (const mode of MODES) {
    const b = v[mode];
    if (
      isObj(b) &&
      isStars(b.stars) &&
      isFiniteNum(b.bestPct) &&
      typeof b.lastPlayed === 'string'
    ) {
      out[mode] = { stars: b.stars, bestPct: b.bestPct, lastPlayed: b.lastPlayed };
    }
  }
  return out;
}

function isQuestion(v: unknown): v is Question {
  return (
    isObj(v) &&
    typeof v.id === 'string' &&
    isMode(v.mode) &&
    typeof v.targetKey === 'string' &&
    typeof v.prompt === 'string' &&
    Array.isArray(v.choices) &&
    v.choices.every((c) => typeof c === 'string') &&
    typeof v.answer === 'string'
  );
}

function sanitizeQuestions(v: unknown): Question[] | null {
  if (!Array.isArray(v) || !v.every(isQuestion)) return null;
  return v;
}

/** Pads or trims answers to one entry per question; non-strings become null. */
function sanitizeAnswers(v: unknown, length: number): (string | null)[] {
  const arr: unknown[] = Array.isArray(v) ? v : [];
  return Array.from({ length }, (_, i) => (typeof arr[i] === 'string' ? (arr[i] as string) : null));
}

function sanitizeActiveRound(v: unknown): ActiveRound | null {
  if (!isObj(v) || !isMode(v.mode)) return null;
  const questions = sanitizeQuestions(v.questions);
  if (!questions || questions.length === 0) return null;
  if (
    !Number.isInteger(v.index) ||
    (v.index as number) < 0 ||
    (v.index as number) >= questions.length
  ) {
    return null;
  }
  return {
    mode: v.mode,
    questions,
    index: v.index as number,
    answers: sanitizeAnswers(v.answers, questions.length),
  };
}

function sanitizeLastResult(v: unknown): LastResult | null {
  if (!isObj(v) || !isMode(v.mode) || !isStars(v.stars)) return null;
  const questions = sanitizeQuestions(v.questions);
  if (!questions || questions.length === 0) return null;
  if (!Number.isInteger(v.score) || !Number.isInteger(v.total)) return null;
  return {
    mode: v.mode,
    questions,
    answers: sanitizeAnswers(v.answers, questions.length),
    score: v.score as number,
    total: v.total as number,
    stars: v.stars,
  };
}

/** Turns any stored value (including missing or corrupt data) into a valid PersistedState. */
export function sanitizePersisted(raw: unknown): PersistedState {
  const o = isObj(raw) ? raw : {};
  return {
    settings: sanitizeSettings(o.settings),
    progress: sanitizeProgress(o.progress),
    bestScores: sanitizeBestScores(o.bestScores),
    activeRound: sanitizeActiveRound(o.activeRound),
    lastResult: sanitizeLastResult(o.lastResult),
  };
}

// ---------------------------------------------------------------------------
// Storage: JSON on top of the never-throwing safeStorage. Corrupt JSON reads as
// "no stored value" so the store starts from defaults instead of throwing.
// ---------------------------------------------------------------------------

// createJSONStorage is typed as possibly undefined (it returns undefined only without a storage getter).
const jsonStorage = createJSONStorage<PersistedState>(
  () => safeStorage,
) as PersistStorage<PersistedState>;

const appStorage: PersistStorage<PersistedState> = {
  getItem: (name) => {
    try {
      return jsonStorage.getItem(name) ?? null;
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      jsonStorage.setItem(name, value);
    } catch {
      // Serialisation failures must not break the app; state stays in memory.
    }
  },
  removeItem: (name) => {
    try {
      jsonStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setRoundLength: (length) =>
        set((s) => ({ settings: { ...s.settings, roundLength: length } })),

      toggleSound: () => set((s) => ({ settings: { ...s.settings, sound: !s.settings.sound } })),

      togglePracticeMistakes: () =>
        set((s) => ({
          settings: { ...s.settings, practiceMistakes: !s.settings.practiceMistakes },
        })),

      startRound: (mode, rng = defaultRng) => {
        const { settings, progress } = get();
        const questions = buildRound(mode, settings.roundLength, progress, rng, {
          practiceMistakes: settings.practiceMistakes,
        });
        set({
          activeRound: {
            mode,
            questions,
            index: 0,
            answers: questions.map(() => null),
          },
          lastResult: null,
        });
      },

      answerCurrent: (choice) => {
        const { activeRound, progress } = get();
        if (!activeRound) return false;
        const question = activeRound.questions[activeRound.index];
        if (!question) return false;

        const recorded = activeRound.answers[activeRound.index];
        if (recorded !== null) return grade(question, recorded);

        const correct = grade(question, choice);
        const answers = activeRound.answers.slice();
        answers[activeRound.index] = choice;
        set({
          activeRound: { ...activeRound, answers },
          progress: updateProgress(progress, question.id, correct),
        });
        return correct;
      },

      nextQuestion: () => {
        const { activeRound } = get();
        if (!activeRound) return;

        const next = activeRound.index + 1;
        if (next < activeRound.questions.length) {
          set({ activeRound: { ...activeRound, index: next } });
          return;
        }

        // Past the last question: finish the round.
        const { mode, questions, answers } = activeRound;
        const total = questions.length;
        const score = questions.filter((q, i) => {
          const a = answers[i];
          return a !== null && grade(q, a);
        }).length;
        const stars = starsFor(score, total);
        const pct = total > 0 ? Math.round((score / total) * 100) : 0;
        const now = new Date().toISOString();

        const prev = get().bestScores[mode];
        const best: BestScore =
          !prev || pct > prev.bestPct
            ? { stars, bestPct: pct, lastPlayed: now }
            : { ...prev, lastPlayed: now };

        set({
          activeRound: null,
          lastResult: { mode, questions, answers, score, total, stars },
          bestScores: { ...get().bestScores, [mode]: best },
        });
      },

      abandonRound: () => set({ activeRound: null }),

      resetProgress: () =>
        set({
          progress: {},
          bestScores: {},
          activeRound: null,
          lastResult: null,
        }),
    }),
    {
      name: STORAGE_KEY,
      version: STORE_VERSION,
      storage: appStorage,
      partialize: (s): PersistedState => ({
        settings: s.settings,
        progress: s.progress,
        bestScores: s.bestScores,
        activeRound: s.activeRound,
        lastResult: s.lastResult,
      }),
      // Runs when the stored version differs. Unknown or old versions keep any valid fields.
      migrate: (persisted) => sanitizePersisted(persisted),
      // Runs on every hydrate, so even same-version data is validated.
      merge: (persisted, current) => ({ ...current, ...sanitizePersisted(persisted) }),
    },
  ),
);
