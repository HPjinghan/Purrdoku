// localStorage persistence (spec §6, §10). Prefix `prd_` mirrors Murdoku's
// `mrd_`. Per-puzzle progress is stored as JSON; an optional RLE encoder is
// provided for compact share strings (spec §2).

const PREFIX = "prd_";
const progressKey = (id) => `${PREFIX}progress_${id}`;
const SETTINGS_KEY = `${PREFIX}settings`;

export function loadProgress(id) {
  try {
    const raw = localStorage.getItem(progressKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveProgress(id, state) {
  try {
    localStorage.setItem(progressKey(id), JSON.stringify(state));
  } catch {
    /* quota / private mode — ignore, game still playable in-memory */
  }
}

export function clearProgress(id) {
  try {
    localStorage.removeItem(progressKey(id));
  } catch {
    /* ignore */
  }
}

export function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  } catch {
    return {};
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

// ---- compact run-length share code for a placement (cat -> cell | null).
// Encodes cell indices as base-36 with '-' separators; null => 'x'.
export function encodePlacement(placement) {
  return placement.map((c) => (c == null ? "x" : c.toString(36))).join("-");
}

export function decodePlacement(code, n) {
  if (!code) return Array(n).fill(null);
  const parts = code.split("-");
  const out = Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const p = parts[i];
    out[i] = p === "x" || p == null ? null : parseInt(p, 36);
  }
  return out;
}
