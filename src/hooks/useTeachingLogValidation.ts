import { useMemo } from "react";

export interface ValidationMessage {
  field: string;
  message: string;
  flag_code?: string;
}

export interface FlagResult {
  code: string;
  description: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  warnings: ValidationMessage[]; // show but allow submit
  errors: ValidationMessage[]; // block submit
  flags: FlagResult[]; // FLAG codes detected
  lateByDays: number; // informational, non-blocking
}

/**
 * Relevant teaching-log fields for validation. Mirrors the form state in
 * src/pages/TeachingLog.tsx (camelCase). `healthCareStatus` is the boolean
 * "has sick students" flag (form maps its "has"/"none" select to this).
 */
export interface TeachingLogValidationInput {
  masteryScore: number | null;
  majorGap: string | null;
  healthCareStatus: boolean;
  healthCareIds: string | null;
  remedialIds: string | null;
  teachingDate: string | null;
  /** Most recent prior mastery for this teacher×subject×classroom (FLAG7). */
  previousMasteryScore: number | null;
}

// Format a score delta without trailing ".0" (scores are usually integers).
function formatDelta(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// A remedial/health-care id field counts as "empty" when it is unset, blank,
// or the literal empty-array sentinel the form may persist.
function isEmptyIds(value: string | null): boolean {
  if (!value) return true;
  const t = value.trim();
  return t === "" || t === "[]";
}

function computeLateByDays(teachingDate: string | null): number {
  if (!teachingDate) return 0;
  const td = new Date(teachingDate + "T00:00:00");
  if (Number.isNaN(td.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - td.getTime()) / 86400000);
  return diffDays > 0 ? diffDays : 0;
}

export function useTeachingLogValidation(
  input: TeachingLogValidationInput
): ValidationResult {
  const {
    masteryScore,
    majorGap,
    healthCareStatus,
    healthCareIds,
    remedialIds,
    teachingDate,
    previousMasteryScore,
  } = input;

  return useMemo(() => {
    const errors: ValidationMessage[] = [];
    const warnings: ValidationMessage[] = [];
    const flags: FlagResult[] = [];

    // ── Errors (block submit) ────────────────────────────────────────────
    if (masteryScore == null || masteryScore < 1 || masteryScore > 5) {
      errors.push({
        field: "masteryScore",
        message: "กรุณาระบุคะแนน Mastery ระหว่าง 1-5",
        flag_code: "FLAG6",
      });
      flags.push({
        code: "FLAG6",
        description: "คะแนน Mastery ไม่ถูกต้อง (ต้องอยู่ระหว่าง 1-5)",
        severity: "error",
      });
    }

    const hasMastery = masteryScore != null;

    // ── Warnings (allow submit) ──────────────────────────────────────────

    // FLAG3 — low mastery but marked Success (or no gap recorded).
    if (hasMastery && masteryScore! <= 3 && (majorGap === "success" || !majorGap)) {
      warnings.push({
        field: "majorGap",
        message:
          "⚠️ Mastery ต่ำกว่า 4 แต่ระบุ Success — กรุณาตรวจสอบ gap ที่แท้จริง",
        flag_code: "FLAG3",
      });
      flags.push({
        code: "FLAG3",
        description: "Mastery ต่ำกว่า 4 แต่ระบุ Success",
        severity: "warning",
      });
    }

    // FLAG2 — high mastery but still a gap recorded.
    if (hasMastery && masteryScore! >= 4 && majorGap && majorGap !== "success") {
      warnings.push({
        field: "majorGap",
        message: "⚠️ Mastery สูง แต่ยังระบุ gap — ตรวจสอบว่าถูกต้องหรือไม่",
        flag_code: "FLAG2",
      });
      flags.push({
        code: "FLAG2",
        description: "Mastery สูง แต่ยังระบุ gap",
        severity: "warning",
      });
    }

    // FLAG1 — sick students reported but no student ids listed.
    if (healthCareStatus && isEmptyIds(healthCareIds)) {
      warnings.push({
        field: "healthCareIds",
        message: "⚠️ ระบุว่ามีนักเรียนป่วย แต่ไม่ได้ระบุรหัสนักเรียน",
        flag_code: "FLAG1",
      });
      flags.push({
        code: "FLAG1",
        description: "ระบุว่ามีนักเรียนป่วย แต่ไม่ได้ระบุรหัสนักเรียน",
        severity: "warning",
      });
    }

    // FLAG4 — a-gap but no remedial plan.
    if (majorGap === "a-gap" && isEmptyIds(remedialIds)) {
      warnings.push({
        field: "remedialIds",
        message:
          "⚠️ พบ a-gap แต่ไม่มีแผนดูแลนักเรียน — กรุณาระบุนักเรียนที่ต้องช่วยเหลือ",
        flag_code: "FLAG4",
      });
      flags.push({
        code: "FLAG4",
        description: "พบ a-gap แต่ไม่มีแผนดูแลนักเรียน",
        severity: "warning",
      });
    }

    // FLAG5 — a2-gap requires external referral. Shown prominently (error sev).
    if (majorGap === "a2-gap") {
      warnings.push({
        field: "majorGap",
        message: "⚠️ พบ a2-gap — นักเรียนรายนี้ต้องได้รับการส่งต่อภายนอก",
        flag_code: "FLAG5",
      });
      flags.push({
        code: "FLAG5",
        description: "พบ a2-gap — ต้องส่งต่อภายนอก",
        severity: "error",
      });
    }

    // FLAG7 — anti-gaming: mastery jumped suspiciously in one period.
    // Neutral, non-accusatory framing ("ระบบจะตรวจสอบ", never "ครูโกง").
    if (
      previousMasteryScore != null &&
      previousMasteryScore <= 3.0 &&
      hasMastery &&
      masteryScore! >= previousMasteryScore + 1.5
    ) {
      const delta = formatDelta(masteryScore! - previousMasteryScore);
      warnings.push({
        field: "masteryScore",
        message:
          `⚠️ Mastery เพิ่มขึ้น ${delta} จุดจากคาบก่อน ` +
          `(${previousMasteryScore} → ${masteryScore}) — ` +
          `ระบบจะตรวจสอบความสอดคล้องกับข้อมูลนักเรียน`,
        flag_code: "FLAG7",
      });
      flags.push({
        code: "FLAG7",
        description: "Mastery เพิ่มขึ้นผิดปกติจากคาบก่อน — ตรวจสอบความสอดคล้องกับข้อมูลนักเรียน",
        severity: "warning",
      });
    }

    // ── Late submission (informational, non-blocking) ────────────────────
    // Surfaced via `lateByDays` so the banner can render its own blue notice
    // (kept out of `warnings` to avoid showing the same message twice).
    const lateByDays = computeLateByDays(teachingDate);

    return { errors, warnings, flags, lateByDays };
  }, [
    masteryScore,
    majorGap,
    healthCareStatus,
    healthCareIds,
    remedialIds,
    teachingDate,
    previousMasteryScore,
  ]);
}
