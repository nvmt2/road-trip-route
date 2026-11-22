"use client";

export type Budget = "low" | "mid" | "high";
export type Preferences = { budget: Budget | null; vegetarian: boolean };
export type HistoryEntry = { category: "food" | "sights"; near: string; at: number };

const PREFS_KEY = "rtr:preferences";
const HISTORY_KEY = "rtr:history";
const HISTORY_LIMIT = 20;

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private mode, quota, etc.) — personalization is a nice-to-have
  }
}

export function loadPreferences(): Preferences {
  return readJSON<Preferences>(PREFS_KEY, { budget: null, vegetarian: false });
}

export function savePreferences(prefs: Preferences): void {
  writeJSON(PREFS_KEY, prefs);
}

export function loadHistory(): HistoryEntry[] {
  return readJSON<HistoryEntry[]>(HISTORY_KEY, []);
}

export function recordSearch(entry: HistoryEntry): void {
  const history = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  writeJSON(HISTORY_KEY, history);
}

function mostFrequent<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

// Best-guess defaults from past searches: what you pick most often.
export function suggestedDefaults(history: HistoryEntry[]): { category: "food" | "sights" | null; near: string | null } {
  return {
    category: mostFrequent(history.map((h) => h.category)),
    near: mostFrequent(history.map((h) => h.near).filter((n) => n)),
  };
}
