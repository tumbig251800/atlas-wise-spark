/**
 * Phase 6: Context Validator — ป้องกัน AI Hallucination
 * Validate ข้อมูลก่อนส่งไป ai-chat
 */

export interface TeachingLogRaw {
  mastery_score: number;
  major_gap: string;
  key_issue?: string | null;
  [key: string]: unknown;
}

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
}

export function validateContextBeforeAI(logs: TeachingLogRaw[]): ValidationResult {
  const warnings: string[] = [];

  if (!logs.length) {
    return { isValid: false, warnings: ["ไม่มีข้อมูลการสอน"] };
  }

  const invalidScores = logs.filter(
    (l) => l.mastery_score < 1 || l.mastery_score > 5 || typeof l.mastery_score !== "number"
  );
  if (invalidScores.length > 0) {
    warnings.push(`พบ mastery_score ผิดปกติ ${invalidScores.length} รายการ (ควรอยู่ระหว่าง 1-5)`);
  }

  const missingIssue = logs.filter(
    (l) => l.major_gap && l.major_gap !== "success" && !l.key_issue?.trim()
  );
  if (missingIssue.length > 0) {
    warnings.push(
      `พบ ${missingIssue.length} รายการที่มี Gap แต่ไม่มี key_issue — AI อาจวิเคราะห์ไม่ครบ`
    );
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}
