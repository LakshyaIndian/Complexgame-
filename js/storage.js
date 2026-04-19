const STORAGE_KEYS = {
  state: "frs2050_state_v1",
};

const DEFAULT_STATE = {
  settings: {
    mode: "standard",
    lowMotion: false,
  },
  currentRun: null,
  unlockedModes: ["standard"],
  history: [],
};

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.state);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_STATE),
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
      unlockedModes: Array.from(new Set([...(parsed.unlockedModes || []), "standard"])),
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (error) {
    console.error("Failed to load save state", error);
    return structuredClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEYS.state);
  return structuredClone(DEFAULT_STATE);
}

export { STORAGE_KEYS, DEFAULT_STATE };
