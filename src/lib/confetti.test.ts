import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const confettiMock = vi.hoisted(() => vi.fn());
vi.mock('canvas-confetti', () => ({ default: confettiMock }));

import { bigBurst, celebration, smallBurst } from './confetti';

/** Stubs window.matchMedia so the reduced-motion query matches (or not). */
function mockReducedMotion(reduce: boolean) {
  window.matchMedia = vi.fn((query: string) => ({
    matches: reduce && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('confetti', () => {
  beforeEach(() => {
    confettiMock.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (window as unknown as { matchMedia?: unknown }).matchMedia;
  });

  it('fires bursts when motion is allowed', () => {
    mockReducedMotion(false);
    smallBurst();
    expect(confettiMock).toHaveBeenCalledTimes(1);
    expect(confettiMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ disableForReducedMotion: true }),
    );
    bigBurst();
    expect(confettiMock).toHaveBeenCalledTimes(4);
    celebration();
    vi.runAllTimers();
    expect(confettiMock.mock.calls.length).toBeGreaterThan(4);
  });

  it('celebration returns a cancel function that stops the pending bursts', () => {
    mockReducedMotion(false);
    const cancel = celebration();
    expect(confettiMock).toHaveBeenCalledTimes(1);
    cancel();
    vi.runAllTimers();
    expect(confettiMock).toHaveBeenCalledTimes(1);
  });

  it('is a no-op under prefers-reduced-motion', () => {
    mockReducedMotion(true);
    smallBurst();
    bigBurst();
    celebration();
    vi.runAllTimers();
    expect(confettiMock).not.toHaveBeenCalled();
  });

  it('is safe when matchMedia is not available (jsdom)', () => {
    smallBurst();
    expect(confettiMock).toHaveBeenCalledTimes(1);
  });
});
