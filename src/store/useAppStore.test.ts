import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildRound, type Question } from '../quiz/engine';
import { mulberry32 } from '../quiz/rng';
import { createSafeStorage } from './safeStorage';
import { initialState, STORAGE_KEY, useAppStore } from './useAppStore';

const state = () => useAppStore.getState();

/** Answers the current question correctly and advances. */
function answerCorrectlyAndAdvance() {
  const round = state().activeRound;
  if (!round) throw new Error('no active round');
  const q = round.questions[round.index];
  state().answerCurrent(q.answer);
  state().nextQuestion();
}

/** Answers the current question incorrectly and advances. */
function answerWrongAndAdvance() {
  const round = state().activeRound;
  if (!round) throw new Error('no active round');
  const q = round.questions[round.index];
  const wrong = q.choices.find((c) => c !== q.answer) as string;
  state().answerCurrent(wrong);
  state().nextQuestion();
}

function playWholeRound(correct: boolean) {
  const total = state().activeRound?.questions.length ?? 0;
  for (let i = 0; i < total; i++) {
    if (correct) answerCorrectlyAndAdvance();
    else answerWrongAndAdvance();
  }
}

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(initialState);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAppStore defaults', () => {
  it('starts with default settings and empty data', () => {
    const s = state();
    expect(s.settings).toEqual({ roundLength: 10, sound: true, practiceMistakes: false });
    expect(s.progress).toEqual({});
    expect(s.bestScores).toEqual({});
    expect(s.activeRound).toBeNull();
    expect(s.lastResult).toBeNull();
  });
});

describe('startRound', () => {
  it('creates a 7-question regions round when round length is 10', () => {
    state().startRound('regions', mulberry32(1));
    const round = state().activeRound;
    expect(round).not.toBeNull();
    expect(round?.mode).toBe('regions');
    expect(round?.questions).toHaveLength(7);
    expect(round?.index).toBe(0);
    expect(round?.answers).toEqual(new Array(7).fill(null));
  });

  it('uses the current round length setting', () => {
    state().setRoundLength(20);
    state().startRound('states', mulberry32(2));
    expect(state().activeRound?.questions).toHaveLength(20);
  });

  it('clears the previous lastResult', () => {
    state().startRound('regions', mulberry32(3));
    playWholeRound(true);
    expect(state().lastResult).not.toBeNull();
    state().startRound('states', mulberry32(4));
    expect(state().lastResult).toBeNull();
  });
});

describe('answerCurrent', () => {
  it('records the answer, updates progress and returns correctness', () => {
    state().startRound('regions', mulberry32(5));
    const q: Question = state().activeRound?.questions[0] as Question;

    const correct = state().answerCurrent(q.answer);
    expect(correct).toBe(true);
    expect(state().activeRound?.answers[0]).toBe(q.answer);
    expect(state().progress[q.id]).toEqual({ seen: 1, correct: 1, box: 1 });
  });

  it('records a wrong answer with box reset to 0', () => {
    state().startRound('regions', mulberry32(6));
    const q = state().activeRound?.questions[0] as Question;
    const wrong = q.choices.find((c) => c !== q.answer) as string;

    expect(state().answerCurrent(wrong)).toBe(false);
    expect(state().progress[q.id]).toEqual({ seen: 1, correct: 0, box: 0 });
  });

  it('ignores a second answer for the same question', () => {
    state().startRound('regions', mulberry32(7));
    const q = state().activeRound?.questions[0] as Question;
    const wrong = q.choices.find((c) => c !== q.answer) as string;

    state().answerCurrent(q.answer);
    const before = state();
    const second = state().answerCurrent(wrong);

    expect(second).toBe(true); // reports the recorded (correct) answer
    expect(state().activeRound?.answers[0]).toBe(q.answer);
    expect(state().progress[q.id]).toEqual(before.progress[q.id]);
    expect(state().progress[q.id].seen).toBe(1);
  });

  it('returns false with no active round', () => {
    expect(state().answerCurrent('anything')).toBe(false);
  });
});

describe('nextQuestion and round completion', () => {
  it('finishes a full round: sets lastResult, bestScores, clears activeRound', () => {
    state().startRound('regions', mulberry32(8));
    const total = state().activeRound?.questions.length ?? 0;
    // Get 6 of 7 right: 86% is 2 stars.
    for (let i = 0; i < total - 1; i++) answerCorrectlyAndAdvance();
    answerWrongAndAdvance();

    expect(state().activeRound).toBeNull();
    const result = state().lastResult;
    expect(result).not.toBeNull();
    expect(result?.mode).toBe('regions');
    expect(result?.total).toBe(7);
    expect(result?.score).toBe(6);
    expect(result?.stars).toBe(2);
    expect(result?.answers).toHaveLength(7);

    const best = state().bestScores.regions;
    expect(best?.stars).toBe(2);
    expect(best?.bestPct).toBe(86);
    expect(new Date(best?.lastPlayed ?? '').toISOString()).toBe(best?.lastPlayed);
  });

  it('advances the index between questions', () => {
    state().startRound('states', mulberry32(9));
    answerCorrectlyAndAdvance();
    expect(state().activeRound?.index).toBe(1);
  });

  it('nextQuestion without an active round does nothing', () => {
    state().nextQuestion();
    expect(state().lastResult).toBeNull();
    expect(state().bestScores).toEqual({});
  });

  it('keeps the better percentage in bestScores', () => {
    state().startRound('regions', mulberry32(10));
    playWholeRound(true);
    expect(state().bestScores.regions?.bestPct).toBe(100);
    expect(state().bestScores.regions?.stars).toBe(3);

    state().startRound('regions', mulberry32(11));
    playWholeRound(false);
    expect(state().lastResult?.score).toBe(0);
    expect(state().bestScores.regions?.bestPct).toBe(100);
    expect(state().bestScores.regions?.stars).toBe(3);
  });

  it('still updates lastPlayed when the new score is not better', () => {
    state().startRound('regions', mulberry32(12));
    playWholeRound(true);
    const firstPlayed = state().bestScores.regions?.lastPlayed;

    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2030-01-02T03:04:05.000Z'));
      state().startRound('regions', mulberry32(13));
      playWholeRound(false);
    } finally {
      vi.useRealTimers();
    }
    expect(state().bestScores.regions?.lastPlayed).toBe('2030-01-02T03:04:05.000Z');
    expect(state().bestScores.regions?.lastPlayed).not.toBe(firstPlayed);
  });
});

describe('abandonRound and resetProgress', () => {
  it('abandonRound clears the active round without a result', () => {
    state().startRound('capitals', mulberry32(14));
    state().abandonRound();
    expect(state().activeRound).toBeNull();
    expect(state().lastResult).toBeNull();
    expect(state().bestScores).toEqual({});
  });

  it('resetProgress clears progress, scores and rounds but keeps settings', () => {
    state().setRoundLength(20);
    state().toggleSound();
    state().togglePracticeMistakes();
    state().startRound('regions', mulberry32(15));
    playWholeRound(true);
    state().startRound('states', mulberry32(16));
    answerCorrectlyAndAdvance();

    state().resetProgress();

    const s = state();
    expect(s.progress).toEqual({});
    expect(s.bestScores).toEqual({});
    expect(s.activeRound).toBeNull();
    expect(s.lastResult).toBeNull();
    expect(s.settings).toEqual({ roundLength: 20, sound: false, practiceMistakes: true });
  });
});

describe('settings actions', () => {
  it('setRoundLength, toggleSound and togglePracticeMistakes update settings', () => {
    state().setRoundLength('all');
    expect(state().settings.roundLength).toBe('all');
    state().toggleSound();
    expect(state().settings.sound).toBe(false);
    state().togglePracticeMistakes();
    expect(state().settings.practiceMistakes).toBe(true);
  });
});

describe('persistence', () => {
  it('writes persisted state to localStorage under usgeo:v1', () => {
    expect(STORAGE_KEY).toBe('usgeo:v1');
    state().setRoundLength(20);
    state().startRound('regions', mulberry32(17));
    answerCorrectlyAndAdvance();

    const raw = localStorage.getItem('usgeo:v1');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.version).toBe(1);
    expect(parsed.state.settings.roundLength).toBe(20);
    expect(parsed.state.activeRound.index).toBe(1);
    expect(Object.keys(parsed.state.progress)).toHaveLength(1);
    expect(parsed.state).not.toHaveProperty('setRoundLength');
  });

  it('rehydrates progress and activeRound from existing localStorage data', async () => {
    const questions = buildRound('states', 10, {}, mulberry32(18), {});
    const payload = {
      state: {
        settings: { roundLength: 10, sound: false, practiceMistakes: true },
        progress: { 'states:01': { seen: 3, correct: 2, box: 2 } },
        bestScores: { states: { stars: 2, bestPct: 80, lastPlayed: '2030-01-01T00:00:00.000Z' } },
        activeRound: {
          mode: 'states',
          questions,
          index: 2,
          answers: [
            questions[0].answer,
            questions[1].answer,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
          ],
        },
        lastResult: null,
      },
      version: 1,
    };
    localStorage.setItem('usgeo:v1', JSON.stringify(payload));

    await useAppStore.persist.rehydrate();

    const s = state();
    expect(s.progress).toEqual({ 'states:01': { seen: 3, correct: 2, box: 2 } });
    expect(s.bestScores.states?.bestPct).toBe(80);
    expect(s.settings.sound).toBe(false);
    expect(s.activeRound?.index).toBe(2);
    expect(s.activeRound?.questions).toHaveLength(10);
    expect(s.activeRound?.answers[1]).toBe(questions[1].answer);
  });

  it('migrates old or unknown versions, keeping valid fields and defaulting the rest', async () => {
    localStorage.setItem(
      'usgeo:v1',
      JSON.stringify({
        state: {
          settings: { roundLength: 20, sound: 'yes' },
          progress: {
            'regions:x': { seen: 1, correct: 1, box: 9 },
            ok: { seen: 1, correct: 0, box: 0 },
          },
          bestScores: { regions: { stars: 3, bestPct: 100, lastPlayed: 'x' }, nope: {} },
          activeRound: { mode: 'regions', questions: 'bad', index: 0 },
        },
        version: 0,
      }),
    );

    await useAppStore.persist.rehydrate();

    const s = state();
    expect(s.settings).toEqual({ roundLength: 20, sound: true, practiceMistakes: false });
    expect(s.progress).toEqual({ ok: { seen: 1, correct: 0, box: 0 } });
    expect(s.bestScores).toEqual({ regions: { stars: 3, bestPct: 100, lastPlayed: 'x' } });
    expect(s.activeRound).toBeNull();
  });

  it('corrupt JSON in localStorage loads defaults without throwing', async () => {
    useAppStore.setState({ settings: { roundLength: 20, sound: false, practiceMistakes: true } });
    localStorage.setItem('usgeo:v1', '{this is not json');

    await expect(useAppStore.persist.rehydrate()).resolves.toBeUndefined();

    const s = state();
    expect(s.settings).toEqual({ roundLength: 10, sound: true, practiceMistakes: false });
    expect(s.progress).toEqual({});
    expect(s.activeRound).toBeNull();
  });

  it('a localStorage.setItem that throws does not crash actions', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    expect(() => state().setRoundLength(20)).not.toThrow();
    expect(() => state().startRound('regions', mulberry32(19))).not.toThrow();
    expect(state().settings.roundLength).toBe(20);
    expect(state().activeRound?.questions).toHaveLength(7);
  });
});

describe('createSafeStorage', () => {
  it('falls back to memory when localStorage.setItem throws', () => {
    const storage = createSafeStorage();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(storage.getItem('k')).toBe('v');
  });

  it('falls back to memory when accessing window.localStorage throws', () => {
    const storage = createSafeStorage();
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('denied', 'SecurityError');
    });

    expect(() => storage.setItem('k', 'v')).not.toThrow();
    expect(storage.getItem('k')).toBe('v');
    expect(() => storage.removeItem('k')).not.toThrow();
    expect(storage.getItem('k')).toBeNull();
  });
});
