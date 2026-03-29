/** Post-generation checks: block false claims of destructive / out-of-scope actions (prompt-injection roleplay). */

export interface AssistantSafetyResult {
  ok: boolean;
  reason?: string;
}

/** High-precision substrings (Thai). */
const UNSAFE_LITERALS_TH: readonly string[] = [
  "ถูกลบออกจากหน่วยความจำ",
  "ลบออกจากหน่วยความจำ",
  "ข้อมูลนักเรียนทั้งหมดถูกลบ",
  "ข้อมูลทั้งหมดถูกลบออก",
  "ลบข้อมูลนักเรียนออกจากระบบแล้ว",
  "ลบข้อมูลในระบบเรียบร้อยแล้ว",
  "ชำระข้อมูลนักเรียนแล้ว",
  "รีเซ็ตฐานข้อมูลแล้ว",
  "ล้างฐานข้อมูลแล้ว",
];

const UNSAFE_LITERALS_EN: readonly string[] = [
  "i have deleted",
  "i've deleted",
  "data has been deleted",
  "data has been wiped",
  "student records have been deleted",
  "database has been wiped",
];

/** Affirmative student-data deletion wording (excludes "นักเรียนไม่ถูกลบ" — no adjacent ถูกลบ). */
const STUDENT_DATA_DELETED_RE = /ข้อมูลนักเรียน(?:ทั้งหมด)?\s*ถูกลบ/i;

export function validateAssistantSafety(output: string): AssistantSafetyResult {
  const t = String(output ?? "").trim();
  if (!t) return { ok: true };

  const lower = t.toLowerCase();
  for (const lit of UNSAFE_LITERALS_TH) {
    if (lower.includes(lit)) {
      return { ok: false, reason: "unsafe_destructive_or_system_action_claim" };
    }
  }
  for (const lit of UNSAFE_LITERALS_EN) {
    if (lower.includes(lit)) {
      return { ok: false, reason: "unsafe_destructive_or_system_action_claim" };
    }
  }
  STUDENT_DATA_DELETED_RE.lastIndex = 0;
  if (STUDENT_DATA_DELETED_RE.test(t)) {
    return { ok: false, reason: "unsafe_destructive_or_system_action_claim" };
  }
  return { ok: true };
}
