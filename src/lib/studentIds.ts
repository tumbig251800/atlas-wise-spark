/**
 * Shared parsing for the comma-separated student-ID fields on teaching_logs
 * (remedial_ids, health_care_ids). Centralized so every read site recognizes
 * the same "no students" sentinels and every write site normalizes to the
 * same comma-only separator — student IDs are 4-digit identifiers, never
 * numbers, and must stay strings end-to-end.
 */

export const STUDENT_ID_PATTERN = /^\d{4}$/;

// All "no students" representations seen across the app's history, matched
// case-insensitively after trimming.
const EMPTY_SENTINELS = new Set(["-", "_", "ไม่มี", "[none]", "[n/a]", "null", "[]"]);

/** True for null/blank/whitespace-only or any recognized "no students" sentinel. */
export function isEmptyIdsValue(value: string | null | undefined): boolean {
  if (!value) return true;
  const t = value.trim();
  if (t === "") return true;
  return EMPTY_SENTINELS.has(t.toLowerCase());
}

/** Split a raw, comma- and/or whitespace-separated ID string into individual tokens. */
export function splitIds(raw: string): string[] {
  return raw.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
}

/**
 * Parse a stored remedial_ids/health_care_ids value into individual IDs.
 * Returns [] for any empty/sentinel representation.
 */
export function parseStoredIds(value: string | null | undefined): string[] {
  if (isEmptyIdsValue(value)) return [];
  return splitIds(value as string);
}
