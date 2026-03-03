/**
 * Phase C: Unit normalization for matching learning_unit (teaching_logs)
 * with unit_name (unit_assessments)
 *
 * Supports: หน่วยที่ 1, Unit 1, หน่วย 1, Unit1, etc.
 */

/**
 * Extract unit number from raw string.
 * Returns null if no number found.
 */
export function extractUnitNumber(s: string | null): number | null {
  if (s == null || typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;

  // Thai: หน่วยที่ 1, หน่วย 1, หน่วยที่1
  const thaiMatch = trimmed.match(/หน่วย(ที่)?\s*(\d+)/i);
  if (thaiMatch) return parseInt(thaiMatch[2], 10);

  // Thai flexible: หน่วยการเรียนรู้ที่ 17, หน่วยการเรียนรู้ 18 การเขียน
  const thaiFlexMatch = trimmed.match(/หน่วย[\s\S]*?(\d+)/i);
  if (thaiFlexMatch) return parseInt(thaiFlexMatch[1], 10);

  // English: Unit 1, Unit1, unit 1
  const enMatch = trimmed.match(/unit\s*(\d+)/i);
  if (enMatch) return parseInt(enMatch[1], 10);

  // Bare number at start
  const bareMatch = trimmed.match(/^(\d+)/);
  if (bareMatch) return parseInt(bareMatch[1], 10);

  return null;
}

/**
 * Convert unit number to canonical key (e.g. "unit-1")
 */
export function toUnitKey(n: number): string {
  return `unit-${n}`;
}

export interface NormalizedUnit {
  unitKey: string;
  displayName: string;
}

/**
 * Normalize raw unit string to canonical key and display name.
 * Returns null if unit cannot be parsed.
 */
export function normalizeUnit(raw: string | null): NormalizedUnit | null {
  const num = extractUnitNumber(raw);
  if (num == null) return null;
  const key = toUnitKey(num);
  const display = raw?.trim() && raw.trim().length > 0 ? raw.trim() : `หน่วยที่ ${num}`;
  return { unitKey: key, displayName: display };
}

/**
 * Sort unit keys by unit number (unit-1, unit-2, unit-10, etc.)
 */
export function sortByUnitKey(keys: string[]): string[] {
  return [...keys].sort((a, b) => {
    const na = extractUnitNumber(a.replace(/^unit-/, ""));
    const nb = extractUnitNumber(b.replace(/^unit-/, ""));
    const numA = na ?? (parseInt(a.replace(/\D/g, ""), 10) || 0);
    const numB = nb ?? (parseInt(b.replace(/\D/g, ""), 10) || 0);
    return numA - numB;
  });
}
