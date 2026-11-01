import { ACTIONS, defaultBinds } from "../core/input.js";

export const STORAGE_KEY = "tankturf-settings";

export function defaultSettings() {
  return {
    volume: 7,
    muted: false,
    roundCount: 3,
    mode: "ffa",
    binds: defaultBinds(),
  };
}

export function sanitizeSettings(raw) {
  const settings = defaultSettings();
  if (!raw || typeof raw !== "object") return settings;
  if (Number.isFinite(raw.volume)) settings.volume = Math.max(0, Math.min(10, raw.volume | 0));
  if (typeof raw.muted === "boolean") settings.muted = raw.muted;
  if (Number.isFinite(raw.roundCount)) settings.roundCount = Math.max(1, Math.min(9, raw.roundCount | 0));
  if (raw.mode === "2v2" || raw.mode === "ffa") settings.mode = raw.mode;
  if (Array.isArray(raw.binds) && raw.binds.length === 4) {
    for (let i = 0; i < 4; i++) {
      const bind = raw.binds[i];
      if (!bind || typeof bind !== "object") continue;
      for (const action of ACTIONS) {
        if (typeof bind[action] === "string" && bind[action]) settings.binds[i][action] = bind[action];
      }
    }
  }
  return settings;
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings();
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return true;
  } catch {
    return false;
  }
}
