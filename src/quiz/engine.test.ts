import { describe, expect, it } from 'vitest';
import { STATE_BY_FIPS, STATES } from '../data/states';
import {
  allItemIds,
  buildRound,
  grade,
  makeChoices,
  makeQuestion,
  starsFor,
  updateProgress,
  type Mode,
  type Progress,
} from './engine';
import { mulberry32, pickWeighted, sample, shuffle } from './rng';

const MODES: Mode[] = ['regions', 'states', 'capitals'];

describe('rng helpers', () => {
  it('mulberry32 is deterministic and in [0,1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('shuffle is non-mutating and a permutation', () => {
    const arr = [1, 2, 3, 4, 5, 6];
    const out = shuffle(arr, mulberry32(1));
    expect(arr).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...out].sort()).toEqual(arr);
  });
  it('sample returns n distinct items', () => {
    const out = sample([1, 2, 3, 4, 5], 3, mulberry32(2));
    expect(new Set(out).size).toBe(3);
    expect(sample([1, 2], 5, mulberry32(2))).toHaveLength(2);
  });
  it('pickWeighted never repeats and handles zero weights', () => {
    const out = pickWeighted(['a', 'b', 'c'], [0, 0, 0], 3, mulberry32(3));
    expect([...out].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('allItemIds', () => {
  it('has 7 regions and 50 states', () => {
    expect(allItemIds('regions')).toHaveLength(7);
    expect(allItemIds('states')).toHaveLength(50);
    expect(allItemIds('capitals')).toHaveLength(50);
  });
});

describe('choices and questions', () => {
  it('always has 4 unique choices including the answer', () => {
    for (const mode of MODES) {
      for (const key of allItemIds(mode)) {
        for (let seed = 0; seed < 20; seed++) {
          const q = makeQuestion(mode, key, mulberry32(seed));
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(q.answer);
        }
      }
    }
  });

  it('prompts are right', () => {
    expect(makeQuestion('regions', 'midwest', mulberry32(1)).prompt).toBe(
      'What region is highlighted?',
    );
    expect(makeQuestion('states', '17', mulberry32(1)).prompt).toBe('What state is highlighted?');
    const q = makeQuestion('capitals', '17', mulberry32(1));
    expect(q.prompt).toBe('What is the capital of Illinois?');
    expect(q.id).toBe('capitals:17');
  });

  it('states distractors include 1-2 same-region states', () => {
    for (const target of STATES) {
      const regionNames = new Set(
        STATES.filter((s) => s.region === target.region && s.fips !== target.fips).map(
          (s) => s.name,
        ),
      );
      for (let seed = 0; seed < 30; seed++) {
        const choices = makeChoices('states', target.fips, mulberry32(seed));
        const same = choices.filter((c) => regionNames.has(c)).length;
        expect(same).toBeGreaterThanOrEqual(1);
        expect(same).toBeLessThanOrEqual(2);
      }
    }
  });

  it('capitals include famousCity when present', () => {
    expect(STATE_BY_FIPS['17'].famousCity).toBe('Chicago');
    for (const s of STATES) {
      for (let seed = 0; seed < 20; seed++) {
        const choices = makeChoices('capitals', s.fips, mulberry32(seed));
        if (s.famousCity) expect(choices).toContain(s.famousCity);
        expect(choices).toContain(s.capital);
      }
    }
  });

  it('grade checks the answer', () => {
    const q = makeQuestion('states', '17', mulberry32(5));
    expect(grade(q, 'Illinois')).toBe(true);
    expect(
      grade(
        q,
        q.choices.find((c) => c !== 'Illinois')!,
      ),
    ).toBe(false);
  });
});

describe('buildRound', () => {
  it('has no repeated targets and is capped at item count', () => {
    for (const mode of MODES) {
      for (let seed = 0; seed < 50; seed++) {
        for (const len of [10, 20] as const) {
          const round = buildRound(mode, len, {}, mulberry32(seed));
          const keys = round.map((q) => q.targetKey);
          expect(new Set(keys).size).toBe(keys.length);
          expect(round).toHaveLength(Math.min(len, allItemIds(mode).length));
        }
      }
    }
  });

  it("'all' covers every item exactly once", () => {
    for (const mode of MODES) {
      const round = buildRound(mode, 'all', {}, mulberry32(9));
      expect(round.map((q) => q.targetKey).sort()).toEqual([...allItemIds(mode)].sort());
    }
  });

  it('regions with length 10 gives 7', () => {
    expect(buildRound('regions', 10, {}, mulberry32(1))).toHaveLength(7);
  });

  it('is deterministic for a given seed', () => {
    const a = buildRound('states', 10, {}, mulberry32(77));
    const b = buildRound('states', 10, {}, mulberry32(77));
    expect(a).toEqual(b);
    const c = buildRound('states', 10, {}, mulberry32(78));
    expect(c).not.toEqual(a);
  });

  it('practiceMistakes favors low-box items', () => {
    const ids = allItemIds('states');
    const progress: Progress = {};
    ids.forEach((id, i) => {
      progress[`states:${id}`] = { seen: 3, correct: i < 25 ? 0 : 3, box: i < 25 ? 0 : 3 };
    });
    const low = new Set(ids.slice(0, 25));
    let lowCount = 0;
    let highCount = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const round = buildRound('states', 10, progress, mulberry32(seed), {
        practiceMistakes: true,
      });
      expect(new Set(round.map((q) => q.targetKey)).size).toBe(10);
      for (const q of round) {
        if (low.has(q.targetKey)) lowCount++;
        else highCount++;
      }
    }
    expect(lowCount).toBeGreaterThan(highCount * 2);
  });

  it('targetKeys drills exactly those items, ignoring length and practiceMistakes', () => {
    const keys = ['17', '39', '41'];
    for (const practiceMistakes of [false, true]) {
      for (const len of [10, 20, 'all'] as const) {
        const round = buildRound('states', len, {}, mulberry32(21), {
          practiceMistakes,
          targetKeys: keys,
        });
        expect(round.map((q) => q.targetKey).sort()).toEqual([...keys].sort());
      }
    }
  });

  it('targetKeys drops duplicates and keys that are not valid for the mode', () => {
    const round = buildRound('states', 10, {}, mulberry32(22), {
      targetKeys: ['17', '17', '99', 'midwest', '39'],
    });
    expect(round.map((q) => q.targetKey).sort()).toEqual(['17', '39']);
  });

  it('empty or all-invalid targetKeys falls back to a normal round', () => {
    const normal = buildRound('states', 10, {}, mulberry32(23));
    expect(buildRound('states', 10, {}, mulberry32(23), { targetKeys: [] })).toEqual(normal);
    const invalid = buildRound('states', 10, {}, mulberry32(23), { targetKeys: ['99'] });
    expect(invalid).toEqual(normal);
  });

  it('targetKeys questions are built for the requested mode', () => {
    const round = buildRound('capitals', 10, {}, mulberry32(24), { targetKeys: ['06'] });
    expect(round).toHaveLength(1);
    expect(round[0].id).toBe('capitals:06');
    expect(round[0].prompt).toBe('What is the capital of California?');
  });

  it('practiceMistakes treats unseen items as box 0', () => {
    const progress: Progress = {};
    for (const id of allItemIds('states').slice(0, 25)) {
      progress[`states:${id}`] = { seen: 5, correct: 5, box: 3 };
    }
    let unseen = 0;
    const seenSet = new Set(allItemIds('states').slice(25));
    for (let seed = 0; seed < 500; seed++) {
      for (const q of buildRound('states', 10, progress, mulberry32(seed), {
        practiceMistakes: true,
      })) {
        if (seenSet.has(q.targetKey)) unseen++;
      }
    }
    expect(unseen).toBeGreaterThan(500 * 10 * 0.7);
  });
});

describe('updateProgress', () => {
  it('transitions boxes and counters immutably', () => {
    const p0: Progress = {};
    const p1 = updateProgress(p0, 'states:17', true);
    expect(p0).toEqual({});
    expect(p1['states:17']).toEqual({ seen: 1, correct: 1, box: 1 });
    let p = p1;
    for (let i = 0; i < 5; i++) p = updateProgress(p, 'states:17', true);
    expect(p['states:17'].box).toBe(3);
    expect(p['states:17'].seen).toBe(6);
    const wrong = updateProgress(p, 'states:17', false);
    expect(wrong['states:17']).toEqual({ seen: 7, correct: 6, box: 0 });
  });
});

describe('starsFor', () => {
  it('thresholds', () => {
    expect(starsFor(10, 10)).toBe(3);
    expect(starsFor(9, 10)).toBe(2);
    expect(starsFor(8, 10)).toBe(2);
    expect(starsFor(7, 10)).toBe(1);
    expect(starsFor(6, 10)).toBe(1);
    expect(starsFor(5, 10)).toBe(0);
    expect(starsFor(0, 10)).toBe(0);
    expect(starsFor(0, 0)).toBe(0);
  });
});

describe('review regressions', () => {
  it('treats a corrupt stored box as box 0', () => {
    const bad = { 'states:17': { seen: 1, correct: 0, box: 9 } } as unknown as Progress;
    expect(updateProgress(bad, 'states:17', true)['states:17'].box).toBe(1);
    expect(() =>
      buildRound('states', 10, bad, mulberry32(1), { practiceMistakes: true }),
    ).not.toThrow();
  });

  it('gives unique capital choices for South Carolina (Charleston collision)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = makeChoices('capitals', '45', mulberry32(seed));
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain('Columbia');
    }
  });

  it('handles degenerate rngs', () => {
    for (const rng of [() => 0, () => 0.9999999]) {
      for (const mode of ['regions', 'states', 'capitals'] as const) {
        const round = buildRound(mode, 10, {}, rng, { practiceMistakes: true });
        for (const q of round) {
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(q.answer);
        }
      }
    }
  });
});
