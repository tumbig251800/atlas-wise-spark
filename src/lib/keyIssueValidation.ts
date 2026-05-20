import { KEY_ISSUE_EXAMPLES_BY_GAP } from "./keyIssueExamples";

export interface KeyIssueValidation {
  isValid: boolean;
  error?: string;
  minLength: number;
}

export interface KeyIssueRules {
  minLength: number;
  helperText: string;
  placeholder: string;
}

/** Strictness depends on mastery: gap cases need richer narrative. */
export function getKeyIssueRules(masteryScore: number | null | undefined): KeyIssueRules {
  const isLowMastery = masteryScore != null && masteryScore <= 3;
  const minLength = isLowMastery ? 10 : 5;
  const helperText = isLowMastery
    ? `อธิบายปัญหาที่พบในคาบนี้เพื่อวางแผนสอนซ่อมเสริม (ขั้นต่ำ ${minLength} ตัวอักษร)`
    : `บันทึกสิ่งที่ทำให้คาบนี้สำเร็จ เพื่อเป็นบันทึกสะท้อน (ขั้นต่ำ ${minLength} ตัวอักษร)`;
  const placeholder = isLowMastery
    ? "เช่น นักเรียนยังจำสูตรไม่ได้ ต้องทบทวนเพิ่ม..."
    : "เช่น เด็กส่วนใหญ่ทำได้ดี เทคนิคจับคู่ช่วยกันเรียนได้ผล...";
  return { minLength, helperText, placeholder };
}

// Pre-compute the set of all example texts so the "didn't customize" check
// is O(1) per validate call instead of rebuilding the flat array each time.
const ALL_EXAMPLE_TEXTS: ReadonlySet<string> = new Set(
  Object.values(KEY_ISSUE_EXAMPLES_BY_GAP)
    .flat()
    .map((ex) => ex.text),
);

export function validateKeyIssue(
  value: string,
  masteryScore: number | null | undefined,
): KeyIssueValidation {
  const { minLength } = getKeyIssueRules(masteryScore);
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: "กรุณากรอกปัญหาหลัก", minLength };
  }
  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `ต้องมีอย่างน้อย ${minLength} ตัวอักษร (มี ${trimmed.length})`,
      minLength,
    };
  }
  // Reject strings made entirely of punctuation/whitespace.
  if (/^[-_.\s•·…]+$/.test(trimmed)) {
    return { isValid: false, error: "ห้ามใช้เฉพาะเครื่องหมายวรรคตอน", minLength };
  }
  // Reject a single repeated character (e.g. "----", "aaaa").
  if (/^(.)\1+$/.test(trimmed)) {
    return { isValid: false, error: "ห้ามใช้ตัวอักษรเดียวซ้ำๆ", minLength };
  }
  // Reject text that exactly matches a provided example — teacher must customize.
  if (ALL_EXAMPLE_TEXTS.has(trimmed)) {
    return {
      isValid: false,
      error: "กรุณาปรับข้อความให้ตรงกับสถานการณ์จริงของท่าน",
      minLength,
    };
  }
  return { isValid: true, minLength };
}
