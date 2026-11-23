import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAudio {
  contexts: number;
  oscillators: number;
}

/** Installs a fake AudioContext on window and returns counters for what was scheduled. */
function installFakeAudio(): FakeAudio {
  const fake: FakeAudio = { contexts: 0, oscillators: 0 };
  class FakeAudioContext {
    currentTime = 0;
    state = 'running';
    destination = {};
    constructor() {
      fake.contexts++;
    }
    createOscillator() {
      fake.oscillators++;
      return {
        type: 'sine',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
    }
    resume = vi.fn(() => Promise.resolve());
  }
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  return fake;
}

describe('sound', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  });

  it('does not throw when AudioContext is missing', async () => {
    const sound = await import('./sound');
    expect(() => sound.playCorrect(true)).not.toThrow();
    expect(() => sound.playWrong(true)).not.toThrow();
    expect(() => sound.playFanfare(true)).not.toThrow();
  });

  it('does nothing when sound is disabled, and never creates a context', async () => {
    const fake = installFakeAudio();
    const sound = await import('./sound');
    sound.playCorrect(false);
    sound.playWrong(false);
    sound.playFanfare(false);
    expect(fake.contexts).toBe(0);
    expect(fake.oscillators).toBe(0);
  });

  it('creates one shared context on first use and schedules the notes when enabled', async () => {
    const fake = installFakeAudio();
    const sound = await import('./sound');
    sound.playCorrect(true);
    expect(fake.oscillators).toBe(2);
    sound.playWrong(true);
    sound.playFanfare(true);
    expect(fake.oscillators).toBe(2 + 1 + 4);
    expect(fake.contexts).toBe(1);
  });

  it('never throws even if the context constructor fails', async () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = class {
      constructor() {
        throw new Error('blocked');
      }
    };
    const sound = await import('./sound');
    expect(() => sound.playFanfare(true)).not.toThrow();
  });
});
