import type { StateStorage } from 'zustand/middleware';

/**
 * Creates a string storage backed by window.localStorage that never throws.
 *
 * Every call re-resolves window.localStorage, because accessing it can throw
 * (blocked cookies, sandboxed iframes) and because quota or private-mode errors
 * can happen on any individual read or write. When the real storage is missing
 * or failing, values are kept in an in-memory Map for the rest of the session.
 */
export function createSafeStorage(): StateStorage {
  const memory = new Map<string, string>();

  const native = (): Storage | null => {
    try {
      return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    } catch {
      return null;
    }
  };

  return {
    getItem(name) {
      const ls = native();
      if (ls) {
        try {
          const stored = ls.getItem(name);
          if (stored !== null) return stored;
        } catch {
          // fall through to memory
        }
      }
      // Native storage is missing, failing, or lacks the value (e.g. a write was rejected).
      return memory.get(name) ?? null;
    },
    setItem(name, value) {
      // Always mirror to memory so a failed native write still survives this session.
      memory.set(name, value);
      const ls = native();
      if (ls) {
        try {
          ls.setItem(name, value);
        } catch {
          // quota exceeded or blocked: memory copy is enough for this session
        }
      }
    },
    removeItem(name) {
      memory.delete(name);
      const ls = native();
      if (ls) {
        try {
          ls.removeItem(name);
        } catch {
          // ignore
        }
      }
    },
  };
}

export const safeStorage: StateStorage = createSafeStorage();
