import type { HistoryEntry } from "@/bindings";

/** The text LocalFlow actually produced for an entry — polished if present, raw otherwise. */
export const displayText = (entry: HistoryEntry): string =>
  entry.post_processed_text ?? entry.transcription_text;

const countWords = (text: string): number =>
  text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;

/** Total words across the given entries (client-side — no backend stats command exists). */
export const totalWords = (entries: HistoryEntry[]): number =>
  entries.reduce((sum, e) => sum + countWords(displayText(e)), 0);

const dayKey = (unixSeconds: number): string =>
  new Date(unixSeconds * 1000).toDateString();

/**
 * Consecutive-day streak ending today or yesterday (so a streak doesn't
 * visibly reset to 0 the instant midnight passes before the day's first
 * dictation). Returns 0 if the most recent entry is older than yesterday.
 * `entries` should be sorted newest-first (as `getHistoryEntries` returns).
 */
export const streakDays = (entries: HistoryEntry[]): number => {
  if (entries.length === 0) return 0;

  const days = new Set(entries.map((e) => dayKey(e.timestamp)));
  const today = new Date();
  const cursor = new Date(today);

  // Anchor the streak at today if there's an entry today, else yesterday —
  // otherwise the streak is broken.
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }

  let streak = 0;
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};
