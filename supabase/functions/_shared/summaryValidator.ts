import {
  extractNumbersFromText,
  extractNumbersWithContext,
  normalizeMasteryToPercent,
} from "./numberExtractor.ts";

export type ValidationLevel = "clean" | "warning" | "suspect";

export interface ValidationResult {
  level: ValidationLevel;
  flaggedCount: number;
  totalOutputNumbers: number;
  disclaimer: string | null;
}

const DISCLAIMERS: Record<ValidationLevel, string | null> = {
  clean: null,
  warning: "⚠️ ตัวเลขบางส่วนอาจถูกปัดเศษ กรุณาตรวจสอบกับข้อมูลต้นทาง",
  suspect: "❌ พบตัวเลขที่อาจไม่ตรงกับข้อมูลในระบบ — ใช้อ้างอิงอย่างระมัดระวัง",
};

function isNumberValid(
  output: number,
  inputPool: number[],
  tolerance = 2
): boolean {
  return inputPool.some((n) => Math.abs(output - n) <= tolerance);
}

export function validateSummary(
  inputText: string,
  outputText: string,
  tolerance = 2
): ValidationResult {
  const rawInputNums = extractNumbersFromText(inputText);
  const inputPool = normalizeMasteryToPercent(rawInputNums);

  const outputWithCtx = extractNumbersWithContext(outputText);
  const flagged = outputWithCtx.filter(
    ({ number }) => !isNumberValid(number, inputPool, tolerance)
  );

  const total = outputWithCtx.length;
  const flaggedCount = flagged.length;

  if (total === 0) {
    return {
      level: "clean",
      flaggedCount: 0,
      totalOutputNumbers: 0,
      disclaimer: null,
    };
  }

  const ratio = flaggedCount / total;
  const level: ValidationLevel =
    flaggedCount === 0
      ? "clean"
      : ratio <= 0.3
        ? "warning"
        : "suspect";

  return {
    level,
    flaggedCount,
    totalOutputNumbers: total,
    disclaimer: DISCLAIMERS[level],
  };
}
