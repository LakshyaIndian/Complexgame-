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

function safeClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readStorage() {
  try {
    return window.localStorage;
  } catch (error) {
    console.error("Local storage is unavailable", error);
    return null;
  }
}

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_STATE.settings,
    ...(settings || {}),
    lowMotion: Boolean(settings?.lowMotion),
  };
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((entry) => entry && typeof entry === "object");
}

export function loadState() {
  const storage = readStorage();
  if (!storage) return safeClone(DEFAULT_STATE);

  try {
    const raw = storage.getItem(STORAGE_KEYS.state);
    if (!raw) return safeClone(DEFAULT_STATE);

    const parsed = JSON.parse(raw);
    return {
      ...safeClone(DEFAULT_STATE),
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      settings: normalizeSettings(parsed?.settings),
      unlockedModes: Array.from(new Set([...(Array.isArray(parsed?.unlockedModes) ? parsed.unlockedModes : []), "standard"])),
      history: normalizeHistory(parsed?.history),
      currentRun: parsed?.currentRun && typeof parsed.currentRun === "object" ? parsed.currentRun : null,
    };
  } catch (error) {
    console.error("Failed to load save state", error);
    return safeClone(DEFAULT_STATE);
  }
}

export function saveState(state) {
  const storage = readStorage();
  if (!storage) return false;

  try {
    storage.setItem(STORAGE_KEYS.state, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error("Failed to save state", error);
    return false;
  }
}

export function resetState() {
  const storage = readStorage();
  try {
    storage?.removeItem(STORAGE_KEYS.state);
  } catch (error) {
    console.error("Failed to reset state", error);
  }
  return safeClone(DEFAULT_STATE);
}

export { STORAGE_KEYS, DEFAULT_STATE };
