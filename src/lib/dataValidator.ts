/**
 * dataValidator.ts
 * ระบบ validate และ normalize ข้อมูลที่ครูกรอก
 * ป้องกันข้อผิดพลาดเช่น ชั้นเขียนผิด, ห้องสลับ, เทอมผิด format
 */

import { resolveSubjectForImport } from "./subjectNormalization";

export type ValidationResult = {
  isValid: boolean;
  normalized: string;
  warnings: string[];
  errors: string[];
};

/**
 * รายการชั้น/ห้องที่ถูกต้อง
 */
const VALID_GRADES = ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"];
const VALID_CLASSROOMS = ["2", "KBW"];

/**
 * Normalize ชั้น - แก้ไขข้อผิดพลาดที่พบบ่อย
 */
export function normalizeGradeLevel(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let normalized = input.trim();

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      warnings,
      errors: ["ชั้นเรียนว่างเปล่า"]
    };
  }

  // แปลงเป็นตัวพิมพ์ใหญ่เพื่อเช็ค
  const upper = normalized.toUpperCase();

  // แก้ไขการสะกดผิด
  const corrections: Record<string, string> = {
    // พิมพ์ผิด
    "ป1": "ป.1",
    "ป2": "ป.2",
    "ป3": "ป.3",
    "ป4": "ป.4",
    "ป5": "ป.5",
    "ป6": "ป.6",
    "ป .1": "ป.1",
    "ป .2": "ป.2",
    "ป .3": "ป.3",
    "ป .4": "ป.4",
    "ป .5": "ป.5",
    "ป .6": "ป.6",
    // ใช้ P แทน ป
    "P.1": "ป.1",
    "P.2": "ป.2",
    "P.3": "ป.3",
    "P.4": "ป.4",
    "P.5": "ป.5",
    "P.6": "ป.6",
    "P1": "ป.1",
    "P2": "ป.2",
    "P3": "ป.3",
    "P4": "ป.4",
    "P5": "ป.5",
    "P6": "ป.6",
    // อักษรไทยผิด
    "ป๑": "ป.1",
    "ป๒": "ป.2",
    "ป๓": "ป.3",
    "ป๔": "ป.4",
    "ป๕": "ป.5",
    "ป๖": "ป.6",
    // เลขล้วน ไม่มี "ป." นำหน้า (เช่น "2" → "ป.2")
    "1": "ป.1",
    "2": "ป.2",
    "3": "ป.3",
    "4": "ป.4",
    "5": "ป.5",
    "6": "ป.6",
    "๑": "ป.1",
    "๒": "ป.2",
    "๓": "ป.3",
    "๔": "ป.4",
    "๕": "ป.5",
    "๖": "ป.6",
  };

  if (corrections[upper]) {
    normalized = corrections[upper];
    warnings.push(`แก้ไขชั้นจาก "${input}" เป็น "${normalized}"`);
  }

  // เช็คว่าถูกต้องหรือไม่
  if (!VALID_GRADES.includes(normalized)) {
    errors.push(`ชั้น "${normalized}" ไม่ถูกต้อง (ต้องเป็น ป.1-ป.6)`);
    return { isValid: false, normalized, warnings, errors };
  }

  return { isValid: true, normalized, warnings, errors };
}

/**
 * Normalize ห้อง - แก้ไขข้อผิดพลาดที่พบบ่อย
 */
export function normalizeClassroom(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let normalized = input.trim();

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      warnings,
      errors: ["ห้องเรียนว่างเปล่า"]
    };
  }

  // แปลงเป็นตัวพิมพ์ใหญ่
  const upper = normalized.toUpperCase();

  // แก้ไขการสะกดผิด
  const corrections: Record<string, string> = {
    // พิมพ์ผิด KBW
    "KWL": "KBW",
    "KWB": "KBW",
    "KBL": "KBW",
    "KVW": "KBW",
    "KBV": "KBW",
    "KBN": "KBW",
    "KNW": "KBW",
    // มีช่องว่าง
    "K BW": "KBW",
    "KB W": "KBW",
    "K B W": "KBW",
    // ใช้ตัวเลข 0 แทน O
    "KB0": "KBW",
    "K0W": "KBW",
    // ตัวพิมพ์เล็ก
    "kbw": "KBW",
    "Kbw": "KBW",
    // อักษรไทย
    "๒": "2",
  };

  if (corrections[upper]) {
    normalized = corrections[upper];
    warnings.push(`แก้ไขห้องจาก "${input}" เป็น "${normalized}"`);
  } else if (upper !== normalized) {
    // ถ้าเป็นตัวพิมพ์เล็ก แปลงเป็นใหญ่
    normalized = upper;
    warnings.push(`แปลงห้องเป็นตัวพิมพ์ใหญ่: "${normalized}"`);
  }

  // ป้องกันการกรอกผิด: ห้องที่ไม่รู้จัก (ไม่ใช่ "2") → นับเป็น KBW เสมอ
  // โรงเรียนมีแค่ห้อง "2" (ปกติ) และ "KBW" (สองภาษา)
  if (!VALID_CLASSROOMS.includes(normalized)) {
    warnings.push(`ห้อง "${normalized}" ไม่รู้จัก → ปรับเป็น "KBW"`);
    normalized = "KBW";
  }

  return { isValid: true, normalized, warnings, errors };
}

/**
 * Normalize ชั้น/ห้อง (format: "ป.3/KBW")
 */
export function normalizeGradeClassroom(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let normalized = input.trim();

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      warnings,
      errors: ["ชั้น/ห้องว่างเปล่า"]
    };
  }

  // แยก ชั้น/ห้อง — รองรับหลายรูปแบบ
  let grade = normalized;
  let classroom = "";
  if (normalized.includes("/")) {
    [grade, classroom] = normalized.split("/").map((s) => s.trim());
  } else {
    // รูปแบบใช้ "." หรือช่องว่างแทน "/" เช่น "ป.3.KBW" หรือ "ป.3 KBW"
    const m = normalized.match(/^(ป\.?\s*[๑-๖1-6])[.\s]+(.+)$/);
    if (m) {
      grade = m[1].trim();
      classroom = m[2].trim();
      warnings.push(`ปรับรูปแบบชั้น/ห้องจาก "${input}" เป็น "${grade}/${classroom}"`);
    }
  }

  // ป้องกันการกรอกผิด: ไม่ระบุห้อง → ใช้ห้องปกติ "2"
  if (!classroom) {
    classroom = "2";
    warnings.push(`ไม่ระบุห้อง → ใช้ห้องปกติ "2"`);
  }

  // Normalize แต่ละส่วน
  const gradeResult = normalizeGradeLevel(grade);
  const classroomResult = normalizeClassroom(classroom);

  // รวม warnings/errors
  warnings.push(...gradeResult.warnings, ...classroomResult.warnings);
  errors.push(...gradeResult.errors, ...classroomResult.errors);

  // สร้าง normalized value
  normalized = `${gradeResult.normalized}/${classroomResult.normalized}`;

  const isValid = gradeResult.isValid && classroomResult.isValid;

  return { isValid, normalized, warnings, errors };
}

/**
 * Normalize academic_term (format: "YYYY-T" เช่น "2569-1" หรือ "2569-2")
 */
export function normalizeAcademicTerm(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  let normalized = input.trim();

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      warnings,
      errors: ["ภาคเรียนว่างเปล่า"]
    };
  }

  // รูปแบบที่ยอมรับ
  const patterns = [
    // "2569-1", "2569-2"
    { regex: /^(\d{4})-([12])$/, format: (y: string, t: string) => `${y}-${t}` },
    // "1/2569", "2/2569"
    { regex: /^([12])\/(\d{4})$/, format: (t: string, y: string) => `${y}-${t}` },
    // "2569/1", "2569/2"
    { regex: /^(\d{4})\/([12])$/, format: (y: string, t: string) => `${y}-${t}` },
    // "1", "2" (ใช้ปีปัจจุบัน)
    { regex: /^([12])$/, format: (t: string) => `${new Date().getFullYear() + 543}-${t}` },
    // "2569-1-1", "2569-1-2" (มี -1 -2 ต่อท้าย เผื่อครูพิมพ์ผิด)
    { regex: /^(\d{4})-([12])-[12]$/, format: (y: string, t: string) => `${y}-${t}` },
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern.regex);
    if (match) {
      const parts = match.slice(1);
      normalized = pattern.format(...parts);

      if (normalized !== input.trim()) {
        warnings.push(`แก้ไขภาคเรียนจาก "${input}" เป็น "${normalized}"`);
      }

      // ตรวจสอบปี (ต้องเป็น พ.ศ. 2560-2580)
      const year = parseInt(normalized.split("-")[0]);
      if (year < 2560 || year > 2580) {
        errors.push(`ปี ${year} ไม่สมเหตุสมผล (ควรอยู่ระหว่าง 2560-2580)`);
        return { isValid: false, normalized, warnings, errors };
      }

      return { isValid: true, normalized, warnings, errors };
    }
  }

  errors.push(`รูปแบบภาคเรียนไม่ถูกต้อง "${input}" (ต้องเป็น "YYYY-T" เช่น "2569-1")`);
  return { isValid: false, normalized, warnings, errors };
}

/**
 * Validate รหัสนักเรียน (ต้องเป็นตัวเลข 4 หลัก)
 */
export function validateStudentId(input: string): ValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  const normalized = input.trim();

  if (!normalized) {
    return {
      isValid: false,
      normalized: "",
      warnings,
      errors: ["รหัสนักเรียนว่างเปล่า"]
    };
  }

  // ต้องเป็นตัวเลข 4 หลัก
  if (!/^\d{4}$/.test(normalized)) {
    errors.push(`รหัสนักเรียน "${normalized}" ไม่ถูกต้อง (ต้องเป็นตัวเลข 4 หลัก)`);
    return { isValid: false, normalized, warnings, errors };
  }

  return { isValid: true, normalized, warnings, errors };
}

/**
 * Validate ทั้งหมดพร้อมกัน
 */
export function validateExcelMetadata(data: {
  subject: string;
  gradeClassroom: string;
  unitName: string;
  academicTerm: string;
}) {
  const allWarnings: string[] = [];
  const allErrors: string[] = [];

  // Validate subject
  if (!data.subject.trim()) {
    allErrors.push("ไม่พบวิชา");
  }

  // Validate grade/classroom
  const gcResult = normalizeGradeClassroom(data.gradeClassroom);
  allWarnings.push(...gcResult.warnings);
  allErrors.push(...gcResult.errors);

  // Validate unit name
  if (!data.unitName.trim()) {
    allErrors.push("ไม่พบหน่วย");
  }

  // Validate academic term
  const termResult = normalizeAcademicTerm(data.academicTerm);
  allWarnings.push(...termResult.warnings);
  allErrors.push(...termResult.errors);

  const [gradeLevel, classroom] = gcResult.normalized.split("/");

  // Normalize ชื่อวิชาให้เป็นมาตรฐานก่อนบันทึก (aliased = แปลงเงียบๆ, unknown = เตือนครู)
  const normalizedSubject = resolveSubjectForImport(
    data.subject,
    gradeLevel,
    allWarnings,
  );

  return {
    isValid: allErrors.length === 0,
    normalized: {
      subject: normalizedSubject,
      gradeLevel,
      classroom,
      unitName: data.unitName.trim(),
      academicTerm: termResult.normalized,
    },
    warnings: allWarnings,
    errors: allErrors,
  };
}
